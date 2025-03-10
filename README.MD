# UseCase.ts

Uma implementação robusta do padrão Result para TypeScript, projetada para gerenciar fluxos de erro de forma elegante e previsível.

## Instalação

```bash
npm install seu-nome-de-pacote
```

## Uso Básico

```typescript
import { Result, Success, Failure, UseCase } from 'seu-nome-de-pacote';

// Exemplo de caso de uso
class GetUserUseCase extends UseCase<{ id: string }, { name: string, email: string }> {
  async execute(input?: { id: string }): Promise<Result<{ name: string, email: string }>> {
    try {
      // Lógica para buscar usuário
      return Success({ name: 'John Doe', email: 'john@example.com' });
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Uso
async function main() {
  const result = await GetUserUseCase.call({ id: '123' });
  
  result
    .onSuccess((data) => {
      console.log('Usuário:', data);
    })
    .onFailure((error) => {
      console.error('Erro:', error.message);
    });
}
```

## Encadeamento de Casos de Uso

```typescript
// Exemplo com encadeamento usando and_then
const result = await firstUseCase.call(input)
  .and_then(async (data) => {
    // Processa os dados do primeiro caso de uso
    return secondUseCase.call({ someParam: data.id });
  })
  .and_then(async (moreData) => {
    // Processa os dados do segundo caso de uso
    return thirdUseCase.call({ anotherParam: moreData.value });
  });

// Verificação do resultado final
result
  .onSuccess((finalData) => {
    console.log('Processo completo:', finalData);
  })
  .onFailure((error) => {
    console.error('Falha no processo:', error.message);
  });
```

## API

### Result<T>

A classe principal que representa o resultado de uma operação.

#### Métodos

- \`getValue()\`: Retorna os dados do resultado.
- \`isSuccess()\`: Verifica se o resultado foi bem-sucedido.
- \`isFailure()\`: Verifica se o resultado falhou.
- \`getError()\`: Retorna o erro, se houver.
- \`and_then<U>(fn)\`: Executa a próxima função apenas se o resultado atual for bem-sucedido.
- \`onSuccess(fn)\`: Executa uma função se o resultado for bem-sucedido.
- \`onFailure(fn, failureType)\`: Executa uma função se o resultado falhar.

### UseCase<I, O>

Classe abstrata para implementar casos de uso.

#### Métodos

- \`execute(input)\`: Método abstrato que deve ser implementado.
- \`call(params)\`: Executa o caso de uso e retorna um Result.
- \`static call<X, Y>(params)\`: Método estático para executar o caso de uso.

## Exemplo com NestJS

```typescript
import { BaseProps, ListOfRecords } from '@core';
import { Result, Success, UseCase } from 'seu-nome-de-pacote';
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
      // Você pode encadear mais casos de uso aqui
      // Se qualquer um falhar, os próximos não serão executados
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

## Exemplo: Autenticação com NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { Result, Success, Failure, UseCase } from 'seu-nome-de-pacote';
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
      // Validar input
      if (!input.email || !input.password) {
        return Failure(
          new Error('Email e senha são obrigatórios'),
          'VALIDATION_ERROR'
        );
      }

      // Buscar usuário
      const user = await this.userRepository.findByEmail(input.email);
      
      if (!user) {
        return Failure(
          new Error('Credenciais inválidas'),
          'AUTHENTICATION_ERROR'
        );
      }

      // Verificar senha
      const isPasswordValid = await this.passwordService.compare(
        input.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return Failure(
          new Error('Credenciais inválidas'),
          'AUTHENTICATION_ERROR'
        );
      }

      // Gerar tokens
      const payload = { sub: user.id, email: user.email, role: user.role };
      
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // Salvar refresh token no banco
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
        error instanceof Error ? error : new Error('Erro desconhecido'),
        'UNEXPECTED_ERROR'
      );
    }
  }
}

// Exemplo de uso
async function authenticate(email: string, password: string) {
  const result = await LoginUseCase.call({ email, password });
  
  result
    .onSuccess((data) => {
      console.log(`Usuário ${data.user.name} autenticado com sucesso`);
      // Armazenar tokens, redirecionar, etc.
    })
    .onFailure((error) => {
      console.error('Falha na autenticação:', error.message);
    }, 'AUTHENTICATION_ERROR')
    .onFailure((error) => {
      console.error('Erro de validação:', error.message);
    }, 'VALIDATION_ERROR')
    .onFailure((error) => {
      console.error('Erro inesperado:', error.message);
    }, 'UNEXPECTED_ERROR');
}
```

## Tratamento de Erros

```typescript
import { Failure, Result, Success, UseCase } from 'seu-nome-de-pacote';

class ProcessarDadosUseCase extends UseCase<string, number> {
  async execute(input?: string): Promise<Result<number>> {
    try {
      if (!input) {
        return Failure(new Error('Input é obrigatório'));
      }
      
      // Processamento que pode falhar
      const numero = parseInt(input);
      
      if (isNaN(numero)) {
        return Failure(
          new Error('Input não é um número válido'),
          'INVALID_NUMBER'
        );
      }
      
      return Success(numero * 2);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro desconhecido'),
        'UNEXPECTED_ERROR'
      );
    }
  }
}

// Uso com tratamento de diferentes tipos de erro
async function processar() {
  const result = await ProcessarDadosUseCase.call('abc');
  
  result
    .onSuccess((data) => {
      console.log('Resultado:', data);
    })
    .onFailure((error) => {
      console.error('Erro genérico:', error.message);
    }, 'FAILURE')
    .onFailure((error) => {
      console.error('Erro de número inválido:', error.message);
    }, 'INVALID_NUMBER')
    .onFailure((error) => {
      console.error('Erro inesperado:', error.message);
    }, 'UNEXPECTED_ERROR');
}
```

## Características

- **Tipagem Forte**: Implementação totalmente tipada para garantir segurança em tempo de compilação
- **Encadeamento Fluente**: API fluente para encadear operações com \`and_then\`
- **Tratamento de Erros Robusto**: Manipulação elegante de erros com tipos de falha personalizáveis
- **Compatível com NestJS**: Funciona perfeitamente com o framework NestJS
- **Zero Dependências**: Não depende de bibliotecas externas
- **Leve e Rápido**: Implementação eficiente com foco em desempenho

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

1. Fork o projeto
2. Crie sua branch de feature (\`git checkout -b feature/amazing-feature\`)
3. Commit suas mudanças (\`git commit -m 'Add some amazing feature'\`)
4. Push para a branch (\`git push origin feature/amazing-feature\`)
5. Abra um Pull Request

## Licença

MIT

