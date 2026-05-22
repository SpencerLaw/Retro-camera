const REQUIRED_STAGES = ['stage1', 'stage2', 'stage3'];
const ADVENTURE_DARES_EXPORT_MARKER = 'anypok-adventure-dares';

function normalizeStageSet(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Import file must be a JSON object with stage1, stage2, stage3 arrays.');
  }

  const missingStage = REQUIRED_STAGES.find((stage) => !Array.isArray(data[stage]));
  if (missingStage) {
    throw new Error('Import file must include stage1, stage2, stage3 arrays.');
  }

  return REQUIRED_STAGES.reduce((nextDares, stage) => {
    const items = data[stage];
    if (!items.every((item) => typeof item === 'string')) {
      throw new Error(`${stage} must contain text items only.`);
    }

    nextDares[stage] = items.map((item) => item.trim()).filter(Boolean);
    return nextDares;
  }, {});
}

export function createAdventureDaresExport(dares, language = 'zh') {
  return {
    app: ADVENTURE_DARES_EXPORT_MARKER,
    version: 1,
    language,
    exportedAt: new Date().toISOString(),
    dares: normalizeStageSet(dares),
  };
}

export function normalizeAdventureDaresImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.app !== ADVENTURE_DARES_EXPORT_MARKER) {
    throw new Error('Import file must be exported from this editor.');
  }

  return normalizeStageSet(data.dares);
}
