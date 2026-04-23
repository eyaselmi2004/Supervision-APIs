-- Supprimer la valeur par défaut avant la conversion
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Renommer l'ancien type
ALTER TYPE userrole RENAME TO userrole_old;

-- Créer le nouveau type
CREATE TYPE userrole AS ENUM ('ADMIN', 'DEVOPS');

-- Convertir les données existantes
ALTER TABLE users 
    ALTER COLUMN role TYPE userrole 
    USING CASE 
        WHEN role::text = 'DEV' THEN 'DEVOPS'::userrole
        WHEN role::text = 'MANAGER' THEN 'DEVOPS'::userrole
        ELSE role::text::userrole
    END;

-- Remettre la valeur par défaut avec le nouveau type
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'DEVOPS'::userrole;

-- Supprimer l'ancien type
DROP TYPE userrole_old;