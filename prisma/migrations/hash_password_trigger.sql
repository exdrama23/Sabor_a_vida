-- Habilita a extensão pgcrypto (necessária para criptografia)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função que faz o hash da senha automaticamente
CREATE OR REPLACE FUNCTION hash_admin_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se a senha NÃO começa com '$2' (ou seja, não é um hash bcrypt)
  -- Isso evita fazer hash de uma senha que já está hasheada
  IF NEW.password IS NOT NULL AND NEW.password NOT LIKE '$2%' THEN
    -- Gera hash bcrypt com custo 12 (mesmo usado no backend)
    NEW.password := crypt(NEW.password, gen_salt('bf', 12));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antiga se existir
DROP TRIGGER IF EXISTS trigger_hash_admin_password ON admins;

-- Cria a trigger que executa antes de INSERT ou UPDATE
CREATE TRIGGER trigger_hash_admin_password
BEFORE INSERT OR UPDATE OF password ON admins
FOR EACH ROW
EXECUTE FUNCTION hash_admin_password();
