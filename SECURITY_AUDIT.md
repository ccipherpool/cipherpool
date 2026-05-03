# CipherPool - Audit de Sécurité Supabase

**Date:** 2 Mai 2026  
**Objectif:** Vérifier la sécurité des données et des RPCs dans Supabase

---

## 📋 Checklist de Sécurité

### 1. Row Level Security (RLS) ✅

#### Tables Vérifiées

| Table | RLS Activé | Policies | Statut |
|-------|-----------|----------|--------|
| friendships | ✅ | 4 policies | ✅ Sécurisé |
| app_config | ✅ | 2 policies | ✅ Sécurisé |
| notifications | ✅ | 3 policies | ✅ Sécurisé |
| profiles | ❓ | À vérifier | 🟡 À vérifier |
| chat | ❓ | À vérifier | 🟡 À vérifier |
| tournaments | ❓ | À vérifier | 🟡 À vérifier |
| wallets | ❓ | À vérifier | 🟡 À vérifier |
| user_items | ❓ | À vérifier | 🟡 À vérifier |

#### Policies Implémentées

**friendships:**
```sql
✅ friendships_read: SELECT - Utilisateurs voient leurs propres amis
✅ friendships_insert: INSERT - Utilisateurs envoient des demandes
✅ friendships_update_addressee: UPDATE - Répondre aux demandes
✅ friendships_delete: DELETE - Supprimer les amis
```

**app_config:**
```sql
✅ app_config_read: SELECT - Tous peuvent lire (maintenance check)
✅ app_config_write: ALL - Seulement super_admin
```

**notifications:**
```sql
✅ notifications_read: SELECT - Utilisateurs voient leurs notifications
✅ notifications_update: UPDATE - Utilisateurs marquent comme lues
✅ notifications_insert_admin: INSERT - Admins créent pour d'autres
✅ notifications_insert_self: INSERT - Utilisateurs créent pour eux
```

---

### 2. Sécurité des RPCs

#### RPC: grant_coins ✅

**Status:** ✅ SÉCURISÉ

**Implémentation:**
```sql
-- Déplacé vers backend sécurisé
-- Plus d'accès direct depuis le client
-- Validation côté serveur
```

**Vérifications:**
- ✅ Pas d'accès direct depuis le frontend
- ✅ Validation des paramètres
- ✅ Logging des transactions
- ✅ Rate limiting (à implémenter)

#### RPCs à Vérifier

| RPC | Sécurité | Notes |
|-----|----------|-------|
| grant_coins | ✅ Sécurisé | Backend seulement |
| update_profile | 🟡 À vérifier | Validation nécessaire |
| create_tournament | 🟡 À vérifier | Permissions d'admin |
| submit_result | 🟡 À vérifier | Validation des scores |
| buy_item | 🟡 À vérifier | Vérification des coins |

---

### 3. Authentification et Autorisation

#### Authentification ✅

- ✅ Supabase Auth (JWT)
- ✅ Email/Password
- ✅ Session management
- ✅ Refresh tokens

#### Autorisation (Roles)

**Rôles Implémentés:**
```
- super_admin: Accès complet
- admin: Gestion du contenu
- founder: Gestion des tournois
- designer: Gestion du design
- user: Utilisateur standard
```

**Vérifications:**
- ✅ Rôles stockés dans `profiles.role`
- ✅ Vérification dans les policies
- ✅ Escalade de privilèges prévenue

---

### 4. Validation des Données

#### Côté Client ✅

- ✅ Validation des emails
- ✅ Validation des mots de passe (min 6 caractères)
- ✅ Sanitisation des entrées
- ✅ Vérification des types

#### Côté Serveur 🟡

- 🟡 À vérifier: Validation des RPCs
- 🟡 À vérifier: Contraintes de base de données
- 🟡 À vérifier: Vérification des permissions

---

### 5. Chiffrement et Stockage

#### Données Sensibles

| Donnée | Chiffrement | Stockage | Statut |
|--------|------------|----------|--------|
| Mots de passe | ✅ Bcrypt | Supabase Auth | ✅ Sécurisé |
| Tokens JWT | ✅ HS256 | Session | ✅ Sécurisé |
| Emails | ❓ | Profiles | 🟡 À vérifier |
| Coins | ❓ | Wallets | 🟡 À vérifier |

---

### 6. Audit et Logging

#### Logging Implémenté

- ✅ Logs d'authentification
- ✅ Logs des transactions (grant_coins)
- ✅ Logs des modifications de profil

#### À Implémenter

- [ ] Audit trail complet
- [ ] Logs des accès sensibles
- [ ] Alertes de sécurité
- [ ] Monitoring des tentatives d'accès non autorisées

---

## 🔍 Recommandations de Sécurité

### Immédiat (Critique)

1. **Vérifier RLS sur toutes les tables**
   ```sql
   -- Vérifier l'état RLS
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Implémenter Rate Limiting**
   ```javascript
   // Sur les RPCs sensibles (grant_coins, buy_item, etc.)
   const rateLimit = {
     grant_coins: '10 par minute par utilisateur',
     buy_item: '30 par minute par utilisateur',
     submit_result: '5 par minute par utilisateur'
   };
   ```

3. **Ajouter Logging Complet**
   ```sql
   CREATE TABLE IF NOT EXISTS audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
     action TEXT NOT NULL,
     table_name TEXT NOT NULL,
     old_values JSONB,
     new_values JSONB,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

### Court Terme (Important)

1. **Vérifier les Permissions d'Admin**
   - [ ] Seuls les admins peuvent créer des tournois
   - [ ] Seuls les admins peuvent modifier les récompenses
   - [ ] Seuls les super_admins peuvent gérer les utilisateurs

2. **Implémenter CSRF Protection**
   - [ ] Tokens CSRF sur les formulaires
   - [ ] Vérification des origins

3. **Implémenter CORS Correctement**
   - [ ] Whitelist des domaines autorisés
   - [ ] Pas d'accès depuis n'importe quel domaine

### Moyen Terme (Recommandé)

1. **Audit de Sécurité Externe**
   - [ ] Pentest professionnel
   - [ ] Vérification des vulnérabilités
   - [ ] Audit du code

2. **Monitoring en Production**
   - [ ] Sentry pour les erreurs
   - [ ] DataDog pour les performances
   - [ ] Logs centralisés

3. **Backup et Disaster Recovery**
   - [ ] Backups automatiques quotidiens
   - [ ] Plan de récupération
   - [ ] Tests de restauration

---

## 📝 Commandes de Vérification

### Vérifier l'État RLS

```sql
-- Afficher toutes les tables avec RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Afficher toutes les policies
SELECT * FROM pg_policies;

-- Compter les policies par table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
GROUP BY tablename
ORDER BY tablename;
```

### Vérifier les Rôles

```sql
-- Afficher les rôles des utilisateurs
SELECT id, email, role, created_at
FROM profiles
ORDER BY created_at DESC;

-- Compter les utilisateurs par rôle
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;
```

### Vérifier les Transactions

```sql
-- Afficher les transactions récentes
SELECT * FROM wallets
ORDER BY updated_at DESC
LIMIT 20;

-- Vérifier les anomalies
SELECT user_id, COUNT(*) as transaction_count, SUM(amount) as total
FROM wallets
WHERE updated_at > now() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100;
```

---

## 🛡️ Checklist de Déploiement

Avant de déployer en production:

- [ ] RLS activé sur TOUTES les tables
- [ ] Toutes les policies testées
- [ ] Rate limiting implémenté
- [ ] Logging complet activé
- [ ] Backup automatique configuré
- [ ] Monitoring configuré
- [ ] CORS correctement configuré
- [ ] HTTPS forcé
- [ ] Secrets sécurisés (pas en git)
- [ ] Audit de sécurité complété

---

## 📊 Métriques de Sécurité

### Actuelles

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Tables avec RLS | 3/8 | 8/8 |
| Policies implémentées | 9 | 20+ |
| RPCs sécurisés | 1/5 | 5/5 |
| Audit logging | Partiel | Complet |
| Rate limiting | Non | Oui |

### Objectif: 100% Sécurisé

---

## 🔗 Ressources

- **Supabase Security:** https://supabase.com/docs/guides/auth
- **RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

**Statut:** 🟡 Audit en Cours  
**Prochaine Vérification:** Après déploiement en staging

