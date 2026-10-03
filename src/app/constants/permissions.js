// Configuração central de ferramentas e suas ações disponíveis no sistema
export const SYSTEM_TOOLS = [
  {
    id: 'criador_setlist',
    name: 'Criador de Setlist',
    path: '/criador_setlist',
    description: 'Repertório de músicas, letras, cifras, multitracks e geração de roteiros.',
    actions: [
      { id: 'view', label: 'Visualizar Repertório e Áudios', defaultRole: ['admin', 'lider_louvor', 'ministro', 'basic'] },
      { id: 'manage_setlist', label: 'Criar / Exportar Setlists', defaultRole: ['admin', 'lider_louvor', 'ministro'] },
      { id: 'sync_drive', label: 'Sincronizar com Google Drive', defaultRole: ['admin', 'lider_louvor'] },
      { id: 'multitracks', label: 'Acessar Multitracks', defaultRole: ['admin', 'lider_louvor', 'ministro'] }
    ]
  },
  {
    id: 'gerenciador_equipes',
    name: 'Gerenciador de Equipes',
    path: '/gerenciador_equipes',
    description: 'Gestão de equipes, voluntários, membros e escalas de serviços.',
    actions: [
      { id: 'view', label: 'Visualizar Equipes e Escalas', defaultRole: ['admin', 'lider_louvor', 'ministro', 'basic'] },
      { id: 'manage_teams', label: 'Cadastrar / Editar Equipes', defaultRole: ['admin', 'lider_louvor'] },
      { id: 'manage_members', label: 'Cadastrar / Editar Membros', defaultRole: ['admin', 'lider_louvor'] },
      { id: 'manage_escalas', label: 'Criar / Editar Escalas de Serviço', defaultRole: ['admin', 'lider_louvor', 'ministro'] },
      { id: 'delete', label: 'Excluir Equipes, Membros ou Escalas', defaultRole: ['admin'] }
    ]
  },
  {
    id: 'gerenciador_gincanas',
    name: 'Gerenciador de Gincanas',
    path: '/gerenciador_gincanas',
    description: 'Gestão de gincanas, pontuação rápida, equipes e histórico de pontos.',
    actions: [
      { id: 'view', label: 'Visualizar Placar e Equipes', defaultRole: ['admin', 'lider_louvor', 'ministro', 'basic'] },
      { id: 'score', label: 'Pontuar / Subtrair Pontos', defaultRole: ['admin', 'lider_louvor', 'ministro'] },
      { id: 'manage_gincanas', label: 'Cadastrar Gincanas e Equipes', defaultRole: ['admin', 'lider_louvor'] },
      { id: 'danger_actions', label: 'Zerar Placar e Excluir Dados', defaultRole: ['admin'] }
    ]
  },
  {
    id: 'admin',
    name: 'Painel de Administração',
    path: '/admin',
    description: 'Gerenciamento de contas de usuários, papéis e privilégios do sistema.',
    actions: [
      { id: 'view', label: 'Acessar Painel Admin', defaultRole: ['admin'] },
      { id: 'manage_users', label: 'Aprovar / Alterar Usuários', defaultRole: ['admin'] },
      { id: 'manage_roles', label: 'Configurar Privilégios das Roles', defaultRole: ['admin'] }
    ]
  }
];

export const SYSTEM_ROLES = [
  { id: 'admin', label: 'Administrador Geral', description: 'Acesso irrestrito a todas as ferramentas e ações.', isSystem: true },
  { id: 'lider_louvor', label: 'Líder de Louvor', description: 'Coordenação de louvor, repertório e escalas.', isSystem: true },
  { id: 'ministro', label: 'Ministro de Louvor', description: 'Montagem de setlists e visualização de equipes.', isSystem: true },
  { id: 'basic', label: 'Básico (Membro)', description: 'Acesso padrão de consulta e visualização.', isSystem: true }
];

// Gera as permissões padrão caso o banco de dados ainda não possua configuração customizada
export function getDefaultRolePermissions() {
  const defaults = {};

  SYSTEM_ROLES.forEach((role) => {
    defaults[role.id] = {
      label: role.label,
      description: role.description,
      isSystem: true,
      tools: {},
      actions: {}
    };

    SYSTEM_TOOLS.forEach((tool) => {
      if (role.id === 'admin') {
        defaults[role.id].tools[tool.id] = true;
        tool.actions.forEach((act) => {
          defaults[role.id].actions[`${tool.id}:${act.id}`] = true;
        });
      } else {
        if (tool.id === 'admin') {
          defaults[role.id].tools[tool.id] = false;
          tool.actions.forEach((act) => {
            defaults[role.id].actions[`${tool.id}:${act.id}`] = false;
          });
        } else {
          const hasAnyDefaultAction = tool.actions.some((act) => act.defaultRole.includes(role.id));
          defaults[role.id].tools[tool.id] = hasAnyDefaultAction;
          tool.actions.forEach((act) => {
            defaults[role.id].actions[`${tool.id}:${act.id}`] = act.defaultRole.includes(role.id);
          });
        }
      }
    });
  });

  return defaults;
}
