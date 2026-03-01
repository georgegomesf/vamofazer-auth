Configure o sistema para:

- Cadastro, autenticação e gerencimento de usuários
- O sistema deve usar NextAuth.js e Google Auth para autenticação

- A persistência dos dados:
  - O sistema deve usar PostgreSQL acessado via Prisma (DATABASE_URL);

- Os métodos de autenticação:
  - E-mail e senha (envio de link de confirmação usando BREVO_API_KEY)
  - Google Auth
  - Código enviado por e-mail (envio de código de confirmação usando BREVO_API_KEY)

- Os perfis de usuários:
  - Administrador
  - Usuário
  - Visitante
  - Bloqueado

- O serviço de autenticação deve atender:
  - Sistemas web externos (ou seja, precisará devolver o usuário autenticado para o sistema externo)
  - Dispositivos móveis (ou seja, precisará devolver o usuário autenticado para o dispositivo móvel)



