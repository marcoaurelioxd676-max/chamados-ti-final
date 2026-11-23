# Sistema de Chamados de TI — Firebase Authentication & RBAC

**Aluno(a):** Marco Aurélio
**Link da Aplicação no Render:** https://SEU-PROJETO.onrender.com

---

## Visão Geral do Projeto

Aplicação web de gerenciamento de chamados de suporte técnico (HelpDesk TI) desenvolvida em **Node.js**, **Express**, **EJS** e **Sequelize (SQLite)**, integrada ao **Firebase Authentication** e **Cloud Firestore** para controle de acesso e gerenciamento de perfis.

### Funcionalidades Implementadas

1. **Autenticação via Firebase (`public/js/login.js` e `controllers/authController.js`):**
   - Login e cadastro de contas com **E-mail e Senha** (`signInWithEmailAndPassword` e `createUserWithEmailAndPassword`).
   - Login social com **Google OAuth** (`signInWithPopup` com `GoogleAuthProvider`).
   - Tratamento de erros amigáveis na interface de login.

2. **Gestão de Sessão e Proteção de Rotas (`middlewares/auth.js`):**
   - Verificação de estado de autenticação no cliente (`onAuthStateChanged`) e validação de cookie de sessão no servidor via **Firebase Admin SDK**.
   - Redirecionamento automático para `/login` caso o usuário não esteja autenticado.
   - Exibição dos dados do usuário logado no menu lateral e botão de **Sair** (`signOut`).

3. **Vínculo de Chamados ao Usuário (`controllers/ticketController.js` e `models/Ticket.js`):**
   - Cada chamado criado grava automaticamente `autorUid`, `autorNome` e `autorEmail` do usuário autenticado.
   - Controle de acesso por perfil (`user`, `tecnico` e `admin`) armazenado na coleção `usuarios` do Firestore.

---

## Credenciais de Acesso (Teste)

| Perfil | E-mail | Senha |
|---|---|---|
| Usuário (`user`) | _preencher após criar no Render_ | _preencher_ |
| Técnico (`tecnico`) | _preencher_ | _preencher_ |
| Administrador (`admin`) | _preencher_ | _preencher_ |

---

## Configuração e Execução Local

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure o Firebase:
   - Preencha o objeto `firebaseConfig` em `config/firebaseClient.js` (ou via variável `FIREBASE_WEB_CONFIG`).
   - Salve a chave privada da conta de serviço do Firebase como `serviceAccountKey.json` na raiz do projeto (arquivo ignorado no `.gitignore`).
   - Ative os métodos **E-mail/senha** e **Google** em *Authentication > Sign-in method* e crie o banco **Firestore**.
3. Inicie o servidor:
   ```bash
   npm start
   ```
   Acesse `http://localhost:3000`.

---

## Deploy no Render

- **Tipo de Serviço:** Web Service
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Variáveis de Ambiente:**
  - `FIREBASE_SERVICE_ACCOUNT`: JSON completo da conta de serviço do Firebase.
  - `NODE_VERSION`: `22`
- **Domínio Autorizado:** Adicionar a URL `.onrender.com` gerada em *Firebase Console > Authentication > Settings > Authorized domains*.
