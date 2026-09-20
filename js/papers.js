const PAPERS = [
  {
    id: "attention",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
    year: 2017,
    venue: "NeurIPS",
    abstract:
      "提出完全基于自注意力的 Transformer，不再依赖循环或卷积。编码器-解码器堆叠、多头注意力与位置编码，成为后来语言模型的骨架。",
    topics: ["NLP", "架构"],
    aliases: ["Transformer"],
    url: "https://arxiv.org/abs/1706.03762",
    pdf: "https://arxiv.org/pdf/1706.03762",
  },
  {
    id: "bert",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    venue: "NAACL",
    abstract:
      "用掩码语言模型做双向预训练，再在下游任务上微调。证明「先读大量文本、再适配任务」可以稳定提升理解类指标。",
    topics: ["NLP", "预训练"],
    aliases: ["BERT"],
    url: "https://arxiv.org/abs/1810.04805",
    pdf: "https://arxiv.org/pdf/1810.04805",
  },
  {
    id: "gpt3",
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "把自回归语言模型做到 1750 亿参数，展示上下文里给几个例子就能完成新任务。少样本、零样本成为后来提示学习的起点。",
    topics: ["NLP", "大模型"],
    aliases: ["GPT-3"],
    url: "https://arxiv.org/abs/2005.14165",
    pdf: "https://arxiv.org/pdf/2005.14165",
  },
  {
    id: "resnet",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    venue: "CVPR",
    abstract:
      "残差连接让网络学习「增量」而不是整段映射，训练深度从几十层走到上百层。ImageNet 上的结果把残差块变成视觉骨干的默认零件。",
    topics: ["CV", "架构"],
    aliases: ["ResNet"],
    url: "https://arxiv.org/abs/1512.03385",
    pdf: "https://arxiv.org/pdf/1512.03385",
  },
  {
    id: "vit",
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: ["Alexey Dosovitskiy", "Lucas Beyer", "Alexander Kolesnikov"],
    year: 2021,
    venue: "ICLR",
    abstract:
      "把图像切成图块、当成 token 送进 Transformer。数据足够时，纯注意力骨干可以不靠卷积达到或超过经典 CNN。",
    topics: ["CV", "架构"],
    aliases: ["ViT"],
    url: "https://arxiv.org/abs/2010.11929",
    pdf: "https://arxiv.org/pdf/2010.11929",
  },
  {
    id: "clip",
    title: "Learning Transferable Visual Models From Natural Language Supervision",
    authors: ["Alec Radford", "Jong Wook Kim", "Chris Hallacy"],
    year: 2021,
    venue: "ICML",
    abstract:
      "用图文对做对比学习，让图像和句子落在同一空间。零样本分类、检索和后续多模态模型，都建立在这条对齐思路上。",
    topics: ["多模态", "CV"],
    aliases: ["CLIP"],
    url: "https://arxiv.org/abs/2103.00020",
    pdf: "https://arxiv.org/pdf/2103.00020",
  },
  {
    id: "ddpm",
    title: "Denoising Diffusion Probabilistic Models",
    authors: ["Jonathan Ho", "Ajay Jain", "Pieter Abbeel"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "把生成看成逐步加噪再逐步去噪。训练目标简洁，采样路径清晰，后来的扩散图像模型大多沿这条线展开。",
    topics: ["生成", "CV"],
    aliases: ["DDPM"],
    url: "https://arxiv.org/abs/2006.11239",
    pdf: "https://arxiv.org/pdf/2006.11239",
  },
  {
    id: "llama",
    title: "LLaMA: Open and Efficient Foundation Language Models",
    authors: ["Hugo Touvron", "Thibaut Lavril", "Gautier Izacard"],
    year: 2023,
    venue: "arXiv",
    abstract:
      "用公开数据训练一组相对小而强的基础模型，并给出可复现的训练配方。开源权重改变了后续指令微调与应用层的生态。",
    topics: ["NLP", "大模型"],
    aliases: ["LLaMA"],
    url: "https://arxiv.org/abs/2302.13971",
    pdf: "https://arxiv.org/pdf/2302.13971",
  },
  {
    id: "cot",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans"],
    year: 2022,
    venue: "NeurIPS",
    abstract:
      "在提示里写出中间推理步骤，大模型在算术、常识和符号任务上的正确率明显上升。说明「怎么问」和「模型有多大」一样关键。",
    topics: ["NLP", "推理"],
    aliases: ["CoT", "思维链"],
    url: "https://arxiv.org/abs/2201.11903",
    pdf: "https://arxiv.org/pdf/2201.11903",
  },
  {
    id: "rag",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "生成前先检索外部文档，把参数记忆和可更新的知识库拆开。问答、事实验证这类知识密集型任务因此更稳、更好改。",
    topics: ["NLP", "检索"],
    aliases: ["RAG"],
    url: "https://arxiv.org/abs/2005.11401",
    pdf: "https://arxiv.org/pdf/2005.11401",
  },
  {
    id: "lora",
    title: "LoRA: Low-Rank Adaptation of Large Language Models",
    authors: ["Edward J. Hu", "Yelong Shen", "Phillip Wallis"],
    year: 2022,
    venue: "ICLR",
    abstract:
      "冻结原权重，只训练低秩增量矩阵，就能把大模型适配到新任务。显存和存储成本下降，多任务切换也更轻。",
    topics: ["大模型", "微调"],
    aliases: ["LoRA"],
    url: "https://arxiv.org/abs/2106.09685",
    pdf: "https://arxiv.org/pdf/2106.09685",
  },
  {
    id: "alphafold",
    title: "Highly Accurate Protein Structure Prediction with AlphaFold",
    authors: ["John Jumper", "Richard Evans", "Alexander Pritzel"],
    year: 2021,
    venue: "Nature",
    abstract:
      "用注意力网络从氨基酸序列预测三维结构，在 CASP 上接近实验精度。说明表示学习也可以直接进入自然科学的核心问题。",
    topics: ["科学", "架构"],
    aliases: ["AlphaFold"],
    url: "https://www.nature.com/articles/s41586-021-03819-2",
  },
];

if (typeof module === "object" && module.exports) {
  module.exports = { PAPERS };
}

if (typeof window !== "undefined") {
  window.PAPERS = PAPERS;
}
