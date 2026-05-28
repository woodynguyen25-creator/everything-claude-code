import type { AgentName } from '@/lib/olympus/types';

export const AGENT_COLORS: Record<AgentName, { hex: string; glow: string; emoji: string; label: string }> = {
  zeus: { hex: '#F59F0B', glow: '#F59F0B40', emoji: '⚡', label: 'Zeus' },
  poseidon: { hex: '#7DD3FC', glow: '#7DD3FC40', emoji: '🌊', label: 'Poseidon' },
  artemis: { hex: '#10B981', glow: '#10B98140', emoji: '🏹', label: 'Artemis' },
  apollo: { hex: '#FBBF24', glow: '#FBBF2440', emoji: '☀️', label: 'Apollo' },
  athena: { hex: '#8B5CF6', glow: '#8B5CF640', emoji: '🦉', label: 'Athena' },
  ares: { hex: '#F43F5E', glow: '#F43F5E40', emoji: '⚔️', label: 'Ares' },
  loki: { hex: '#F97316', glow: '#F9731640', emoji: '🔥', label: 'Loki' },
  anubis: { hex: '#C9A961', glow: '#C9A96140', emoji: '⚖️', label: 'Anubis' },
  hades: { hex: '#7C3AED', glow: '#7C3AED40', emoji: '💀', label: 'Hades' },
  hephaestus: { hex: '#EAB308', glow: '#EAB30840', emoji: '🔨', label: 'Hephaestus' },
  calliope: { hex: '#EC4899', glow: '#EC489940', emoji: '🎭', label: 'Calliope' },
};

export const AGENT_ORDER: AgentName[] = [
  'zeus',
  'poseidon',
  'artemis',
  'apollo',
  'athena',
  'ares',
  'loki',
  'anubis',
  'hephaestus',
  'hades',
  'calliope',
];
