## Mudanças solicitadas

### 1. Remover "Admin" do header da tela do cliente
Em `src/routes/index.tsx`, remover o `<Link to="/auth">Admin</Link>` do cabeçalho. O acesso ao painel continua disponível digitando `/auth` na URL — apenas o botão visível some.

### 2. Número da casa obrigatório no checkout
Em `src/routes/index.tsx` (CheckoutModal), adicionar um campo separado **"Número"** (input numérico) ao lado/abaixo do endereço, marcado como `required`. O endereço final salvo no banco fica como `"<endereço>, nº <numero>"`. Sem isso, o pedido não envia.

### 3. Envio de comprovante no Pix
No checkout, quando o método de pagamento for **Pix**:
- Mostrar a chave Pix (vou adicionar campo `pix_key` em `store_info` via migração — admin edita pela aba "Loja").
- Botão para anexar o comprovante (imagem/PDF). Upload para um bucket público novo `payment-proofs` no storage.
- A URL do comprovante é salva no pedido em uma nova coluna `payment_proof_url` (migração).
- O cliente pode confirmar o pedido sem o comprovante, mas aparece aviso "Envie o comprovante". No painel admin, na aba Pedidos, mostrar link "Ver comprovante" quando existir.

## Detalhes técnicos
- **Migração**: `ALTER TABLE store_info ADD COLUMN pix_key text;` + `ALTER TABLE orders ADD COLUMN payment_proof_url text;` + criação do bucket público `payment-proofs` com policy de INSERT para `anon` e SELECT público.
- **Admin** (`_authenticated/admin.tsx`): novo input "Chave Pix" na aba Loja; coluna/linha "Comprovante" na lista de pedidos.
- **Frontend** (`index.tsx`): campo Número obrigatório; bloco Pix com chave + uploader que chama `supabase.storage.from('payment-proofs').upload(...)` e grava a URL no insert do pedido.
