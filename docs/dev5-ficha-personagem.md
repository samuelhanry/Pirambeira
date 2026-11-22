# Módulo: Ficha do Personagem
**Responsável:** Dev 5  
**Componente:** Avatar, Status e Inventário

## Responsabilidades
- Persistir e expor atributos (FOR, AGI, INT, PRE, VIG), nível e HP.
- Gerar portrait visual via `@google/genai` (Imagen 3) utilizando a descrição estética inserida pelo jogador.
- Atualizar inventário e equipamentos durante acontecimentos da partida.

## Tabela do Banco: `personagens`
Contém relacionamento 1:N com a tabela `usuarios`, armazenando o JSON de inventário e os links de imagem gerados por IA.
