export const MAIN_MODEL_ID = "anthropic/claude-haiku-4.5";

export type MainModelOption = {
  id: string;
  label: string;
};

export const MAIN_MODEL_OPTIONS: MainModelOption[] = [
  { id: "z-ai/glm-4.5-air", label: "GLM 4.5 Air (Ultra Cheap)" },
  { id: "z-ai/glm-4.5-flash", label: "GLM 4.5 Flash (Ultra Cheap)" },
  { id: "deepseek/deepseek-v3.1", label: "DeepSeek V3.1 (Ultra Cheap)" },
  { id: "alibaba/qwen3-30b-a3b", label: "Qwen3 30B A3B (Ultra Cheap)" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (Cheap)" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini (Cheap)" },
  { id: "xai/grok-4.1-fast-reasoning", label: "Grok 4.1 Fast Reasoning" },
  { id: "openai/gpt-5.3-codex", label: "GPT-5.3 Codex (Frontier)" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 (Frontier)" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6 (Frontier)" },
];
