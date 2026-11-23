// Controle de autenticação no navegador (Firebase Auth: E-mail/Senha e Google OAuth)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const scriptTag = document.querySelector('script[data-ok]');
const getEl = (id) => document.getElementById(id);
const actionButtons = [getEl('btn-entrar'), getEl('btn-criar'), getEl('btn-google')];

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Credenciais inválidas. Confira o e-mail e a senha digitados.',
  'auth/invalid-login-credentials': 'Credenciais inválidas. Confira o e-mail e a senha digitados.',
  'auth/wrong-password': 'Senha incorreta. Tente novamente.',
  'auth/user-not-found': 'Nenhuma conta localizada para este e-mail. Clique em "Criar conta".',
  'auth/invalid-email': 'Formato de e-mail inválido.',
  'auth/missing-password': 'Por favor, digite sua senha.',
  'auth/email-already-in-use': 'Este endereço de e-mail já está cadastrado.',
  'auth/weak-password': 'A senha precisa ter no mínimo 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.',
  'auth/network-request-failed': 'Falha na conexão com a rede. Verifique sua internet.',
  'auth/popup-closed-by-user': 'O login com Google foi cancelado antes da conclusão.',
  'auth/cancelled-popup-request': 'A janela de autenticação Google foi fechada.',
  'auth/popup-blocked': 'Pop-up bloqueado pelo navegador. Habilite pop-ups para continuar.',
  'auth/unauthorized-domain': 'Domínio não autorizado no Console do Firebase (Authorized domains).',
  'auth/operation-not-allowed': 'Provedor de login desativado nas configurações do Firebase.',
  'auth/user-disabled': 'Esta conta de usuário encontra-se desativada.',
};

function exibirErro(mensagem) {
  getEl('auth-erro-texto').textContent = mensagem;
  getEl('auth-erro').hidden = false;
}

function ocultarErro() {
  getEl('auth-erro').hidden = true;
}

function alternarCarregamento(bloqueado) {
  actionButtons.forEach((btn) => {
    if (btn) btn.disabled = bloqueado;
  });
}

function formatarErroFirebase(err) {
  if (err && err.code && FIREBASE_ERROR_MESSAGES[err.code]) {
    return FIREBASE_ERROR_MESSAGES[err.code];
  }
  return (err && err.message) || 'Erro inesperado ao autenticar. Tente novamente.';
}

if (!scriptTag || !scriptTag.dataset.ok) {
  alternarCarregamento(true);
} else {
  const firebaseConfig = JSON.parse(getEl('firebase-config').textContent);
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  let autenticandoManualmente = false;

  async function sincronizarSessaoServidor(user, nomeInformado) {
    const idToken = await user.getIdToken(true);
    const resposta = await fetch('/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, nome: nomeInformado }),
    });
    const payload = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(payload.erro || 'Erro ao registrar sessão no servidor.');
    }
    window.location.href = payload.redirect || '/';
  }

  async function processarLogin(callbackAuth) {
    ocultarErro();
    alternarCarregamento(true);
    autenticandoManualmente = true;
    try {
      const { user, nome } = await callbackAuth();
      await sincronizarSessaoServidor(user, nome);
    } catch (err) {
      exibirErro(formatarErroFirebase(err));
      alternarCarregamento(false);
      autenticandoManualmente = false;
    }
  }

  // Login tradicional (E-mail e Senha)
  getEl('form-login').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = getEl('email').value.trim();
    const senha = getEl('senha').value;

    if (!email || !senha) {
      return exibirErro('Preencha o e-mail e a senha para acessar.');
    }

    return processarLogin(async () => {
      const credencial = await signInWithEmailAndPassword(auth, email, senha);
      return { user: credencial.user };
    });
  });

  // Cadastro de novo usuário
  getEl('btn-criar').addEventListener('click', () => {
    const nome = getEl('nome').value.trim();
    const email = getEl('email').value.trim();
    const senha = getEl('senha').value;

    if (!nome) return exibirErro('Digite seu nome completo para criar o cadastro.');
    if (!email || !senha) return exibirErro('Informe e-mail e senha para cadastrar.');

    return processarLogin(async () => {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(credencial.user, { displayName: nome });
      return { user: credencial.user, nome };
    });
  });

  // Autenticação via Google OAuth
  getEl('btn-google').addEventListener('click', () => {
    processarLogin(async () => {
      const provider = new GoogleAuthProvider();
      const credencial = await signInWithPopup(auth, provider);
      return { user: credencial.user };
    });
  });

  // Gerenciamento de estado da sessão no cliente
  if (scriptTag.dataset.saiu) {
    signOut(auth);
  } else {
    onAuthStateChanged(auth, async (user) => {
      if (!user || autenticandoManualmente) return;
      autenticandoManualmente = true;
      alternarCarregamento(true);
      try {
        await sincronizarSessaoServidor(user);
      } catch (err) {
        await signOut(auth);
        alternarCarregamento(false);
        autenticandoManualmente = false;
      }
    });
  }
}
