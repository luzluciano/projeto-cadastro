// Exemplo de uso do sistema de autenticação e permissões no frontend

// ===== CLASSE PARA GERENCIAR AUTENTICAÇÃO =====
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Fazer login
  async login(usuario, senha) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usuario, senha })
      });

      const result = await response.json();

      if (result.success) {
        this.token = result.data.token;
        this.user = result.data.usuario;
        
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return { success: true, user: this.user };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Fazer logout
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Verificar se está autenticado
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Verificar se tem uma permissão específica
  hasPermission(permission) {
    if (!this.user || !this.user.permissions) return false;
    return this.user.permissions.includes(permission);
  }

  // Obter cabeçalho de autorização
  getAuthHeader() {
    return this.token ? `Bearer ${this.token}` : null;
  }

  // Fazer requisição autenticada
  async fetchWithAuth(url, options = {}) {
    const authHeader = this.getAuthHeader();
    if (!authHeader) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': authHeader
      }
    });

    // Se token expirado, fazer logout
    if (response.status === 401) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Token expirado');
    }

    return response;
  }
}

// ===== EXEMPLOS DE USO =====

// Instanciar o gerenciador de autenticação
const auth = new AuthManager();

// ===== EXEMPLO 1: COMPONENTE DE LOGIN =====
class LoginComponent {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usuario = document.getElementById('usuario').value;
      const senha = document.getElementById('senha').value;
      
      const result = await auth.login(usuario, senha);
      
      if (result.success) {
        console.log('Login realizado com sucesso!', result.user);
        this.redirectBasedOnPermissions();
      } else {
        alert(`Erro no login: ${result.message}`);
      }
    });
  }

  redirectBasedOnPermissions() {
    if (auth.hasPermission('sistema.configurar')) {
      window.location.href = '/admin';
    } else if (auth.hasPermission('inscricoes.criar')) {
      window.location.href = '/inscricoes';
    } else {
      window.location.href = '/consulta';
    }
  }
}

// ===== EXEMPLO 2: COMPONENTE DE GESTÃO DE USUÁRIOS =====
class UserManagementComponent {
  constructor() {
    this.container = document.getElementById('userManagement');
    this.checkPermissions();
    this.loadUsers();
  }

  checkPermissions() {
    if (!auth.hasPermission('usuarios.listar')) {
      this.container.innerHTML = '<p>Você não tem permissão para visualizar usuários.</p>';
      return;
    }
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div>
        <h2>Gestão de Usuários</h2>
        ${auth.hasPermission('usuarios.criar') ? 
          '<button onclick="this.createUser()">Criar Usuário</button>' : ''}
        <div id="usersList"></div>
      </div>
    `;
  }

  async loadUsers() {
    if (!auth.hasPermission('usuarios.listar')) return;

    try {
      const response = await auth.fetchWithAuth('/api/usuarios');
      const result = await response.json();

      if (result.success) {
        this.renderUsersList(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }

  renderUsersList(users) {
    const usersList = document.getElementById('usersList');
    
    const usersHTML = users.map(user => `
      <div class="user-item">
        <span>${user.nome} (${user.usuario})</span>
        <div>
          ${auth.hasPermission('usuarios.editar') ? 
            `<button onclick="this.editUser(${user.id})">Editar</button>` : ''}
          ${auth.hasPermission('usuarios.deletar') ? 
            `<button onclick="this.deleteUser(${user.id})">Deletar</button>` : ''}
        </div>
      </div>
    `).join('');

    usersList.innerHTML = usersHTML;
  }

  async createUser() {
    if (!auth.hasPermission('usuarios.criar')) {
      alert('Você não tem permissão para criar usuários');
      return;
    }

    const usuario = prompt('Nome de usuário:');
    const senha = prompt('Senha:');
    const nome = prompt('Nome completo:');

    if (!usuario || !senha || !nome) return;

    try {
      const response = await auth.fetchWithAuth('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usuario, senha, nome })
      });

      const result = await response.json();

      if (result.success) {
        alert('Usuário criado com sucesso!');
        this.loadUsers();
      } else {
        alert(`Erro: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  }

  async editUser(userId) {
    if (!auth.hasPermission('usuarios.editar')) {
      alert('Você não tem permissão para editar usuários');
      return;
    }
    
    // Implementar edição...
    console.log('Editar usuário:', userId);
  }

  async deleteUser(userId) {
    if (!auth.hasPermission('usuarios.deletar')) {
      alert('Você não tem permissão para deletar usuários');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const response = await auth.fetchWithAuth(`/api/usuarios/${userId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('Usuário deletado com sucesso!');
        this.loadUsers();
      } else {
        alert(`Erro: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  }
}

// ===== EXEMPLO 3: MIDDLEWARE PARA ROTAS =====
function requirePermission(permission) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = function(...args) {
      if (!auth.hasPermission(permission)) {
        alert(`Permissão necessária: ${permission}`);
        return;
      }
      return method.apply(this, args);
    };
    
    return descriptor;
  };
}

// Uso do decorator
class AdminComponent {
  @requirePermission('sistema.configurar')
  configureSystem() {
    console.log('Configurando sistema...');
  }

  @requirePermission('grupos.criar')
  createGroup() {
    console.log('Criando grupo...');
  }
}

// ===== EXEMPLO 4: FUNÇÃO PARA PROTEGER ELEMENTOS DA UI =====
function protectElement(elementId, permission) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (!auth.hasPermission(permission)) {
    element.style.display = 'none';
    // ou element.remove();
  }
}

// Usar após o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  // Proteger botões baseado em permissões
  protectElement('createUserBtn', 'usuarios.criar');
  protectElement('deleteUserBtn', 'usuarios.deletar');
  protectElement('adminPanelBtn', 'sistema.configurar');
});

// ===== EXEMPLO 5: VERIFICAÇÃO AUTOMÁTICA DE PERMISSÕES EM FORMULÁRIOS =====
function setupPermissionBasedForm() {
  const forms = document.querySelectorAll('[data-permission]');
  
  forms.forEach(form => {
    const requiredPermission = form.getAttribute('data-permission');
    
    if (!auth.hasPermission(requiredPermission)) {
      form.style.display = 'none';
    }
  });
}

// ===== EXEMPLO HTML CORRESPONDENTE =====
/*
<!DOCTYPE html>
<html>
<head>
    <title>Sistema de Cadastro</title>
</head>
<body>
    <!-- Formulário de Login -->
    <form id="loginForm">
        <input type="text" id="usuario" placeholder="Usuário" required>
        <input type="password" id="senha" placeholder="Senha" required>
        <button type="submit">Login</button>
    </form>

    <!-- Área protegida por permissões -->
    <div id="userManagement"></div>

    <!-- Botões com proteção baseada em permissões -->
    <button id="createUserBtn" data-permission="usuarios.criar">Criar Usuário</button>
    <button id="deleteUserBtn" data-permission="usuarios.deletar">Deletar Usuário</button>
    <button id="adminPanelBtn" data-permission="sistema.configurar">Painel Admin</button>

    <!-- Formulário protegido -->
    <form data-permission="inscricoes.criar">
        <h3>Criar Inscrição</h3>
        <!-- campos do formulário -->
    </form>

    <script src="auth-example.js"></script>
</body>
</html>
*/