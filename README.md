# N8N MCP Server

Serveur MCP (Model Context Protocol) pour gérer plusieurs instances N8N depuis Claude, VSCode ou tout autre client MCP.

## Fonctionnalités

11 outils MCP disponibles :

| Outil | Description |
|-------|-------------|
| `n8n_list_instances` | Lister les instances N8N disponibles |
| `n8n_list_workflows` | Lister les workflows |
| `n8n_search_workflows` | Rechercher des workflows |
| `n8n_get_workflow` | Récupérer un workflow |
| `n8n_create_workflow` | Créer un workflow |
| `n8n_update_workflow` | Mettre à jour un workflow |
| `n8n_delete_workflow` | Supprimer un workflow |
| `n8n_toggle_workflow` | Activer/désactiver un workflow |
| `n8n_execute_workflow` | Exécuter un workflow |
| `n8n_list_executions` | Lister les exécutions |
| `n8n_get_execution` | Détails d'une exécution |

## Modes de transport

Le serveur supporte deux modes de transport :

| Mode | Usage | Variable |
|------|-------|----------|
| **SSE** (défaut) | Déploiement sur Coolify/Docker | `MCP_TRANSPORT=sse` |
| **stdio** | Usage local (Claude Desktop) | `MCP_TRANSPORT=stdio` |

## Installation

### Prérequis

- Node.js 18+
- Une ou plusieurs instances N8N avec API activée

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/businessarchi/n8n-mcp-server.git
cd n8n-mcp-server

# Installer les dépendances
npm install

# Build
npm run build
```

## Configuration

### Variables d'environnement

#### Option 1 : Configuration JSON (recommandé pour plusieurs instances)

```bash
N8N_INSTANCES='[{"name":"prod","url":"https://n8n.example.com","apiKey":"your-api-key"},{"name":"dev","url":"https://n8n-dev.example.com","apiKey":"your-api-key"}]'
```

#### Option 2 : Configuration individuelle

```bash
# Instance 1
N8N_INSTANCE_1_NAME=prod
N8N_INSTANCE_1_URL=https://n8n.example.com
N8N_INSTANCE_1_API_KEY=your-api-key

# Instance 2
N8N_INSTANCE_2_NAME=dev
N8N_INSTANCE_2_URL=https://n8n-dev.example.com
N8N_INSTANCE_2_API_KEY=your-api-key
```

#### Option 3 : Instance unique

```bash
N8N_URL=https://n8n.example.com
N8N_API_KEY=your-api-key
N8N_INSTANCE_NAME=default
```

### Générer une clé API N8N

1. Aller dans **Settings** → **API** dans votre instance N8N
2. Créer une nouvelle clé API
3. Copier la clé et l'utiliser dans la configuration

## Utilisation

### Avec Claude Desktop (mode stdio)

Ajouter dans `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows) :

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/chemin/vers/n8n-mcp-server/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "N8N_INSTANCES": "[{\"name\":\"prod\",\"url\":\"https://n8n.example.com\",\"apiKey\":\"xxx\"}]"
      }
    }
  }
}
```

### Avec un client MCP SSE (mode réseau)

Une fois déployé sur Coolify, le serveur expose :

| Endpoint | Description |
|----------|-------------|
| `GET /` | Informations sur le serveur |
| `GET /health` | Health check |
| `GET /sse` | Connexion SSE pour les clients MCP |
| `POST /messages` | Envoi de messages au serveur |

Configuration client MCP SSE :
```json
{
  "mcpServers": {
    "n8n": {
      "transport": "sse",
      "url": "https://votre-serveur.coolify.io/sse"
    }
  }
}
```

## Déploiement sur Coolify

### Configuration Coolify

1. **Créer une nouvelle application** dans Coolify
2. **Source** : GitHub → Sélectionner ce repository
3. **Type de build** : Dockerfile
4. **Port exposé** : `3000`

### Variables d'environnement Coolify

```
N8N_INSTANCES=[{"name":"prod","url":"https://n8n.example.com","apiKey":"xxx"}]
```

Ou individuellement :

```
N8N_INSTANCE_1_NAME=prod
N8N_INSTANCE_1_URL=https://n8n.example.com
N8N_INSTANCE_1_API_KEY=your-api-key
```

### Health Check

Configurer le health check vers `/health` sur le port `3000`.

## Développement

```bash
# Mode développement avec rechargement automatique
npm run dev

# Build
npm run build

# Démarrer en production (SSE par défaut)
npm start

# Démarrer en mode stdio
MCP_TRANSPORT=stdio npm start
```

## Architecture

```
src/
├── index.ts        # Point d'entrée MCP Server (SSE + stdio)
├── config.ts       # Gestion de la configuration
├── n8n-client.ts   # Client API N8N
├── tools.ts        # Définitions des 11 outils MCP
└── types.ts        # Types TypeScript
```

## Licence

MIT
