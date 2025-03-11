[![CI](https://github.com/brunosps/usecase_ts/actions/workflows/ci.yml/badge.svg)](https://github.com/brunosps/usecase_ts/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/usecase_ts.svg)](https://badge.fury.io/js/usecase_ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# usecase_ts (Inspired by [u-case](https://github.com/serradura/u-case))

A robust implementation of the Result pattern for TypeScript, designed to manage error flows in an elegant and predictable way.

## Installation

```bash
npm install usecase_ts
```

## Basic Usage

```typescript
import { Result, Success, Failure, UseCase } from 'usecase_ts';

// Example use case
class GetUserUseCase extends UseCase<{ id: string }, { name: string, email: string }> {
  async execute(input?: { id: string }): Promise<Result<{ name: string, email: string }>> {
    try {
      // Logic to fetch user
      return Success({ name: 'John Doe', email: 'john@example.com' });
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Usage
async function main() {
  const result = await GetUserUseCase.call({ id: '123' });
  
  result
    .onSuccess((data) => {
      console.log('User:', data);
    })
    .onFailure((error) => {
      console.error('Error:', error.message);
    });
}
```

## Chaining Use Cases

```typescript
// Example with chaining using and_then
const result = await firstUseCase.call(input)
  .and_then(async (data) => {
    // Process data from the first use case
    return secondUseCase.call({ someParam: data.id });
  })
  .and_then(async (moreData) => {
    // Process data from the second use case
    return thirdUseCase.call({ anotherParam: moreData.value });
  });

// Check the final result
result
  .onSuccess((finalData) => {
    console.log('Process complete:', finalData);
  })
  .onFailure((error) => {
    console.error('Process failed:', error.message);
  });
```

## API

### Result<T>

The main class that represents the result of an operation.

#### Methods

- \`getValue()\`: Returns the result data.
- \`isSuccess()\`: Checks if the result was successful.
- \`isFailure()\`: Checks if the result failed.
- \`getError()\`: Returns the error, if any.
- \`and_then<U>(fn)\`: Executes the next function only if the current result is successful.
- \`onSuccess(fn)\`: Executes a function if the result is successful.
- \`onFailure(fn, failureType)\`: Executes a function if the result fails.

### UseCase<I, O>

Abstract class for implementing use cases.

#### Methods

- \`execute(input)\`: Abstract method that must be implemented.
- \`call(params)\`: Executes the use case and returns a Result.
- \`static call<X, Y>(params)\`: Static method to execute the use case.

## Example with NestJS

```typescript
import { BaseProps, ListOfRecords } from '@core';
import { Result, Success, UseCase } from 'usecase_ts';
import { Injectable } from '@nestjs/common';

import { ItemEntity } from '../domain/entities/item.entity';
import { GetItemList } from './item/get-item-list.use-case';

class QueryItemsInput extends BaseProps {
  page: number;
  perPage: number;
  category: string;
  department: string;
}

class ItemOutput extends BaseProps {
  name: string;
  category: string;
  department: string;
  departmentName: string;
}

class QueryItemsOutput extends ListOfRecords<ItemOutput> {}

@Injectable()
export class QueryItems extends UseCase<
  QueryItemsInput,
  QueryItemsOutput
> {
  constructor(
    private readonly getItemList: GetItemList,
    private readonly otherUseCase: OtherUseCase
  ) {
    super();
  }

  async execute(
    input: QueryItemsInput,
  ): Promise<Result<QueryItemsOutput>> {
    return this.getItemList.call({
      page: input.page ?? 0,
      perPage: input.perPage ?? 0,
      category: input.category ?? '',
      department: input.department ?? '',
    })
    .and_then(async (data) => 
      Success({
        meta: data.meta,
        records: data.records.map((res) => this.mapToOutput(res)),
      })
    )
    .and_then(async (resultado) => {
      // You can chain more use cases here
      // If any fails, the next ones won't be executed
      return this.otherUseCase.call({ 
        someParameter: resultado.records.length 
      });
    });
  }

  private mapToOutput(item: ItemEntity): ItemOutput {
    return {
      name: item.name,
      category: item.category,
      department: item.department,
      departmentName: item.departmentName,
    };
  }
}
```

## Example: Authentication with NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { Result, Success, Failure, UseCase } from 'usecase_ts';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from '../services/password.service';

// Input DTO
class LoginInput {
  email: string;
  password: string;
}

// Output DTO
class LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class LoginUseCase extends UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService
  ) {
    super();
  }

  async execute(input: LoginInput): Promise<Result<LoginOutput>> {
    try {
      // Validate input
      if (!input.email || !input.password) {
        return Failure(
          new Error('Email and password are required'),
          'VALIDATION_ERROR'
        );
      }

      // Find user
      const user = await this.userRepository.findByEmail(input.email);
      
      if (!user) {
        return Failure(
          new Error('Invalid credentials'),
          'AUTHENTICATION_ERROR'
        );
      }

      // Verify password
      const isPasswordValid = await this.passwordService.compare(
        input.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return Failure(
          new Error('Invalid credentials'),
          'AUTHENTICATION_ERROR'
        );
      }

      // Generate tokens
      const payload = { sub: user.id, email: user.email, role: user.role };
      
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // Save refresh token in database
      await this.userRepository.updateRefreshToken(user.id, refreshToken);

      return Success({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Unknown error'),
        'UNEXPECTED_ERROR'
      );
    }
  }
}

// Usage example
async function authenticate(email: string, password: string) {
  const result = await LoginUseCase.call({ email, password });
  
  result
    .onSuccess((data) => {
      console.log(`User ${data.user.name} authenticated successfully`);
      // Store tokens, redirect, etc.
    })
    .onFailure((error) => {
      console.error('Authentication failed:', error.message);
    }, 'AUTHENTICATION_ERROR')
    .onFailure((error) => {
      console.error('Validation error:', error.message);
    }, 'VALIDATION_ERROR')
    .onFailure((error) => {
      console.error('Unexpected error:', error.message);
    }, 'UNEXPECTED_ERROR');
}
```

## Error Handling

```typescript
import { Failure, Result, Success, UseCase } from 'usecase_ts';

class ProcessDataUseCase extends UseCase<string, number> {
  async execute(input?: string): Promise<Result<number>> {
    try {
      if (!input) {
        return Failure(new Error('Input is required'));
      }
      
      // Processing that might fail
      const number = parseInt(input);
      
      if (isNaN(number)) {
        return Failure(
          new Error('Input is not a valid number'),
          'INVALID_NUMBER'
        );
      }
      
      return Success(number * 2);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Unknown error'),
        'UNEXPECTED_ERROR'
      );
    }
  }
}

// Usage with different error type handling
async function process() {
  const result = await ProcessDataUseCase.call('abc');
  
  result
    .onSuccess((data) => {
      console.log('Result:', data);
    })
    .onFailure((error) => {
      console.error('Generic error:', error.message);
    }, 'FAILURE')
    .onFailure((error) => {
      console.error('Invalid number error:', error.message);
    }, 'INVALID_NUMBER')
    .onFailure((error) => {
      console.error('Unexpected error:', error.message);
    }, 'UNEXPECTED_ERROR');
}
```

## Features

- **Strong Typing**: Fully typed implementation to ensure compile-time safety
- **Fluent Chaining**: Fluent API for chaining operations with \`and_then\`
- **Robust Error Handling**: Elegant error handling with customizable failure types
- **NestJS Compatible**: Works seamlessly with the NestJS framework
- **Zero Dependencies**: Does not depend on external libraries
- **Lightweight and Fast**: Efficient implementation focused on performance

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the project
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

MIT

