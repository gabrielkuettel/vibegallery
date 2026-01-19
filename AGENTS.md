# AGENTS.md

## Environment

This project is configured with VibeKit for Algorand development. You have:

- **Skills** — Markdown reference docs covering syntax, patterns, and workflows. Load them before writing code.
- **MCP Tools** — Actions for interacting with the blockchain, searching docs, and managing accounts.

Two MCP servers are configured:
- `kappa` — Algorand documentation search
- `vibekit-mcp` — Contract deployment, method calls, state reads, account management

## Quick Reference

| Task | Skill | Key Command/Tool |
|------|-------|------------------|
| New project | `create-project` | `algokit init -t typescript` |
| Write contract | `build-smart-contracts` | — |
| Syntax help | `algorand-typescript` | — |
| Build/test | `use-algokit-cli` | `algokit project run build` |
| Write tests | `test-smart-contracts` | `algokit project run test` |
| Deploy | `call-smart-contracts` | `algokit project deploy localnet` |
| Call methods | `call-smart-contracts` | MCP: `app_call` |
| React frontend | `deploy-react-frontend` | — |
| Find examples | `search-algorand-examples` | MCP: `github_search_code` |
| Fix errors | `troubleshoot-errors` | MCP: `indexer_lookup_application_logs` |
| ARC standards | `implement-arc-standards` | — |
| Client code | `use-algokit-utils` | — |

## Development Workflow

```
1. algokit localnet start          # Start local network
2. algokit project run build       # Compile contracts
3. algokit project run test        # Run integration tests
4. algokit project deploy localnet # Deploy to localnet
```

## MCP Tools

MCP tools require a running MCP server. If tools aren't available, check for `.mcp.json` (Claude) or `opencode.json` (OpenCode) in project root, then restart your agent.

### Documentation & Examples

| Tool | Purpose |
|------|---------|
| `kappa_search_algorand_knowledge_sources` | Search Algorand docs |
| `github_search_code` | Find code patterns in repos |
| `github_get_file_contents` | Retrieve files from repos |

### Apps (Smart Contracts)

| Tool | Purpose |
|------|---------|
| `app_call` | Call ABI methods (use `methodSignature`) |
| `app_deploy` | Deploy contract (prefer CLI instead) |
| `app_get_info` | Query deployed app info |
| `app_list_methods` | Parse ARC-56/32 app spec |
| `app_opt_in` | Opt account into app |
| `app_close_out` | Remove local state |
| `app_delete` | Delete application |

### State

| Tool | Purpose |
|------|---------|
| `read_global_state` | Read app-wide state |
| `read_local_state` | Read per-account state |
| `read_box` | Read box storage |

### Accounts

| Tool | Purpose |
|------|---------|
| `list_accounts` | List managed accounts |
| `create_account` | Create new account |
| `get_account_info` | Get account details |
| `fund_account` | Fund from dispenser |
| `send_payment` | Transfer ALGO |

### Assets

| Tool | Purpose |
|------|---------|
| `create_asset` | Create ASA (tokens, NFTs) |
| `get_asset_info` | Query asset details |
| `asset_opt_in` | Opt into asset |
| `asset_transfer` | Transfer assets |

### Indexer (Debugging)

| Tool | Purpose |
|------|---------|
| `indexer_lookup_transaction` | Look up transaction by ID |
| `indexer_lookup_application_logs` | Debug contract execution |
| `indexer_search_transactions` | Search transactions |

### Network

| Tool | Purpose |
|------|---------|
| `get_network` | Current network info |
| `switch_network` | Change network |

## Common Patterns

**Call a contract method:**
```
Tool: app_call
Args: { appId: 1234, methodSignature: "increment()uint64" }
```

**Read contract state:**
```
Tool: read_global_state
Args: { appId: 1234 }
```

## Troubleshooting

**MCP tools not available:** Check MCP config file exists, restart agent.

**Localnet errors:** Run `algokit localnet start` or `algokit localnet reset`.

**Transaction failures:** Use `indexer_lookup_application_logs` with the app ID to see execution logs.
