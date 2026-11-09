# 📦 PrazoCerto — Controle Inteligente de Validade para o Pequeno Varejo

> **Trabalho Prático Incremental — Empreendedorismo em Sistemas de Informação (2026/2)**  
> **Universidade Federal de Lavras (UFLA)**  
> **Professor:** Johnatan Oliveira

---

## 👥 Integrantes do Grupo

* **Arthur Catarino de Oliveira**
* **Gabriel Coelho Costa**
* **Heitor Ramos Vieira Rocha**
* **Lucas Reis Silvino**
* **Petter Douglas Rodrigues Araújo**

---

## 🎯 Problema

Em pequenos estabelecimentos alimentícios (como mercearias, mercados de bairro, padarias e lojas de conveniência), o controle de validade de produtos perecíveis e de alta rotatividade ainda depende de inspeções visuais manuais exaustivas nas prateleiras. 

Por outro lado, os sistemas de gestão tradicionais (ERPs) são complexos, exigem alto esforço de implantação e não destacam informações de vencimento de forma proativa na rotina corrida do lojista. Como consequência, os estabelecimentos sofrem perdas financeiras recorrentes pelo descarte de mercadorias vencidas e desperdiçam horas operacionais em conferências manuais.

---

## 🛒 Público-Alvo

* **Usuários e Clientes:** Donos, gerentes e repositores de pequenos varejos alimentícios (mercearias, mercados de bairro, padarias e lojas de conveniência).
* **Contexto de Uso:** Operação diária diretamente nas gôndolas e no estoque (forte necessidade de uso via dispositivos móveis), por profissionais que precisam de agilidade para identificar lotes críticos e tomar decisões rápidas (como aplicar promoções ou realocar produtos).

---

## 💡 Proposta de Valor

Oferecemos uma plataforma web simples, enxuta e focada no **controle antecipado de vencimento de produtos**. 

* **Benefício Principal:** Redução direta das perdas financeiras geradas pelo descarte de produtos vencidos e diminuição do tempo gasto em conferências manuais nas gôndolas.
* **Diferencial:** Ao contrário de ERPs robustos e burocráticos, o **PrazoCerto** atua direto na dor do vencimento por meio de alertas visuais configuráveis (sistema de "farol") e listas de prioridade acionáveis para facilitar ações preventivas (como promoções relâmpago e destaque de gôndola).

---

## 🚀 Descrição do MVP (Mínimo Produto Viável)

O MVP foi projetado sob o conceito *mobile-first* para validar se uma interface rápida de cadastro e um painel visual de alertas geram ações práticas de prevenção de perdas na rotina do pequeno varejista.

### Fluxo Principal do MVP
`Estabelecimento acessa o sistema` ➔ `Cadastra lote/produto rapidamente` ➔ `Sistema calcula criticidade conforme regra de antecedência` ➔ `Painel "Farol" destaca itens urgentes` ➔ `Usuário realiza ação preventiva e dá baixa (Vendido/Promoção ou Descartado)`

### Funcionalidades Incluídas no Escopo
1. **Autenticação Básica:** Cadastro de estabelecimento e login de usuário.
2. **Cadastro Simplificado de Produto/Lote:** Inserção rápida de Nome, Código de Barras (opcional), Lote, Quantidade e Data de Validade, com validação contra dados inválidos.
3. **Painel de Controle (Dashboard "Farol"):** Visualização centralizada e ordenada pela proximidade do vencimento:
   * 🟢 **Verde:** Dentro do prazo seguro.
   * 🟡 **Amarelo:** Próximo ao vencimento (conforme antecedência configurada pela loja).
   * 🔴 **Vermelho:** Vencido ou em estado crítico imediato.
4. **Configuração de Antecedência:** Definição simples de quantos dias antes do vencimento o alerta amarelo deve ser acionado (ex: 7, 10 ou 15 dias).
5. **Baixa Rápida de Produto (Saída):** Registro de saída do lote como *"Vendido/Promoção"* ou *"Descartado"* para manter o painel limpo e medir perdas evitadas.

### Fora do Escopo do MVP
* Integração automática com sistemas de frente de caixa (PDV) e emissão de notas fiscais.
* Gestão financeira e fluxo de caixa.
* Controle de múltiplas filiais.
* Disparo automatizado de mensagens externas via SMS/WhatsApp.

---

## 🛠️ Tecnologias Utilizadas

* **Front-end:** HTML5, CSS3, JavaScript e Bootstrap (interface responsiva *mobile-first*)
* **Back-end:** Node.js e Express
* **Banco de Dados:** MySQL
* **Hospedagem / Deploy:** serviço Node.js com acesso a uma instância MySQL
* **Gestão e Versionamento:** Git, GitHub, GitHub Issues e GitHub Projects

---

## 🌐 Link da Aplicação

* 🔗 **Acesso ao MVP Online (Produção):** ainda não publicado. O link será informado após configurar a hospedagem e o banco MySQL de produção.
* 🔗 **Repositório Oficial:** [https://github.com/petterdouglas/PrazoCerto](https://github.com/petterdouglas/PrazoCerto)

### Publicação do MVP

O servidor Express serve a interface e a API no mesmo domínio, portanto o front-end usa caminhos relativos para funcionar tanto localmente quanto hospedado. O arquivo [`render.yaml`](./render.yaml) prepara o serviço web para o Render. Para publicar:

1. No Render, crie um Blueprint apontando para este repositório e aceite o serviço definido em `render.yaml`.
2. Quando solicitado, informe `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` como variáveis secretas do serviço. `DB_PORT` usa `3306` por padrão e o Render gera `JWT_SECRET` automaticamente. Não grave esses valores no repositório.
3. Configure o acesso de rede do MySQL hospedado para aceitar conexões do serviço.
4. No Shell do serviço, inicialize o esquema com `npm run db:init` e, se desejar dados de demonstração, execute `npm run seed`.
5. Teste o endereço HTTPS público em um celular e substitua o status acima pelo link definitivo.

---

## 💻 Instruções para Executar Localmente

Siga os passos abaixo para executar o projeto em ambiente de desenvolvimento local:

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18 ou superior)
* [Git](https://git-scm.com/)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/petterdouglas/PrazoCerto.git
   cd PrazoCerto
   ```

2. **Acesse a pasta do código-fonte e instale as dependências:**
   ```bash
   cd src
   npm install
   ```

3. **Configure as variáveis de ambiente (se aplicável):**
   Crie um arquivo `.env` na pasta `src/` baseado no arquivo `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Crie o banco e carregue os dados de demonstração:**
   ```bash
   npm run db:init
   npm run seed
   ```
   A seed cria, caso ainda não exista, o estabelecimento `Mercado Boa Compra` e inclui
   lotes realistas em diferentes situações de validade. A execução pode ser repetida sem
   duplicar os lotes. Para acessar a conta criada: `demo@prazocerto.local` / `123456`.

5. **Inicie a aplicação:**
   ```bash
   npm run dev
   ```

6. **Acesse no navegador:**
   Abra `http://localhost:3000` (ou a porta indicada no terminal).

---

## 📂 Estrutura do Repositório

O repositório segue a organização exigida pela disciplina para garantir rastreabilidade de todas as etapas:

```text
/
|-- README.md
|-- docs/
|   |-- entrega-01/        # Descoberta do problema e oportunidade
|   |-- entrega-02/        # Validação do problema, clientes e mercado
|   |-- entrega-03/        # Proposta de valor, modelo de negócio e definição do MVP
|   |-- entrega-04/        # Documentação do MVP funcional e validação da solução
|   |-- entrega-05/        # Consolidação final e dossiê empresarial
|   |-- relatorio-final/   # Relatório final completo em PDF
|   |-- apresentacao/      # Slides e materiais do Pitch
|-- src/                   # Código-fonte do MVP PrazoCerto
|-- prototipo/             # Wireframes e protótipos iniciais
|-- evidencias/            # Comprovações de entrevistas e testes (anonimizadas)
|-- testes/                # Roteiros, métricas e resultados dos testes de usabilidade
|-- LICENSE                # Licença do projeto
```

---

## 📊 Situação Atual do Projeto

| Marco | Entrega | Data Limite | Status |
| :---: | :--- | :---: | :---: |
| **1** | Descoberta do problema e oportunidade | 29/09/2026 | ✅ Concluído |
| **2** | Validação do problema, clientes e mercado | 13/10/2026 | ✅ Concluído |
| **3** | Proposta de valor, modelo de negócio e definição do MVP | 27/10/2026 | ✅ Concluído |
| **4** | **MVP funcional e validação da solução** | **10/11/2026** | 🚧 **Em andamento** |
| **5** | Entrega final e Pitch | 01/12/2026 | ⏳ Pendente |
