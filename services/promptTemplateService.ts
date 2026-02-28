import type {
  PromptTemplateConfig,
  PromptTemplateOverrides,
} from '../types';

const CAMERA_MOVEMENT_REFERENCE = `- Horizontal Left Shot (向左平移) - Camera moves left
- Horizontal Right Shot (向右平移) - Camera moves right
- Pan Left Shot (平行向左扫视) - Pan left
- Pan Right Shot (平行向右扫视) - Pan right
- Vertical Up Shot (向上直线运动) - Move up vertically
- Vertical Down Shot (向下直线运动) - Move down vertically
- Tilt Up Shot (向上仰角运动) - Tilt upward
- Tilt Down Shot (向下俯角运动) - Tilt downward
- Zoom Out Shot (镜头缩小/拉远) - Pull back/zoom out
- Zoom In Shot (镜头放大/拉近) - Push in/zoom in
- Dolly Shot (推镜头) - Dolly in/out movement
- Circular Shot (环绕拍摄) - Orbit around subject
- Over the Shoulder Shot (越肩镜头) - Over shoulder perspective
- Pan Shot (摇镜头) - Pan movement
- Low Angle Shot (仰视镜头) - Low angle view
- High Angle Shot (俯视镜头) - High angle view
- Tracking Shot (跟踪镜头) - Follow subject
- Handheld Shot (摇摄镜头) - Handheld camera
- Static Shot (静止镜头) - Fixed camera position
- POV Shot (主观视角) - Point of view
- Bird's Eye View Shot (俯瞰镜头) - Overhead view
- 360-Degree Circular Shot (360度环绕) - Full circle
- Parallel Tracking Shot (平行跟踪) - Side tracking
- Diagonal Tracking Shot (对角跟踪) - Diagonal tracking
- Rotating Shot (旋转镜头) - Rotating movement
- Slow Motion Shot (慢动作) - Slow-mo effect
- Time-Lapse Shot (延时摄影) - Time-lapse
- Canted Shot (斜视镜头) - Dutch angle
- Cinematic Dolly Zoom (电影式变焦推轨) - Vertigo effect`;

export const DEFAULT_PROMPT_TEMPLATE_CONFIG: PromptTemplateConfig = {
  storyboard: {
    shotGeneration: `Act as a professional cinematographer. Generate a detailed shot list (Camera blocking) for Scene {sceneIndex}.
Language for Text Output: {lang}.

IMPORTANT VISUAL STYLE: {stylePrompt}
All 'visualPrompt' fields MUST describe shots in this "{visualStyle}" style.
{artDirectionBlock}
Scene Details:
Location: {sceneLocation}
Time: {sceneTime}
Atmosphere: {sceneAtmosphere}

Scene Action:
"{sceneAction}"
Scene Action Source: {actionSource}

Context:
Genre: {genre}
Visual Style: {visualStyle} ({stylePrompt})
Target Duration (Whole Script): {targetDuration}
Active Video Model: {activeVideoModel}
Shot Duration Baseline: {shotDurationSeconds}s per shot
Total Shots Budget: {totalShotsNeeded} shots
Shots for This Scene: {shotsPerScene} shots (EXACT)

Characters:
{charactersJson}
Props:
{propsJson}

Professional Camera Movement Reference (Choose from these categories):
{cameraMovementReference}

Instructions:
1. Create EXACTLY {shotsPerScene} shots for this scene.
2. CRITICAL: Each shot should represent about {shotDurationSeconds} seconds. Total planning formula: {targetSeconds} seconds ÷ {shotDurationSeconds} ≈ {totalShotsNeeded} shots across all scenes.
3. DO NOT output more or fewer than {shotsPerScene} shots for this scene.
4. 'cameraMovement': Can reference the Professional Camera Movement Reference list above for inspiration, or use your own creative camera movements. You may use the exact English terms (e.g., "Dolly Shot", "Pan Right Shot", "Zoom In Shot", "Tracking Shot") or describe custom movements.
5. 'shotSize': Specify the field of view (e.g., Extreme Close-up, Medium Shot, Wide Shot).
6. 'actionSummary': Detailed description of what happens in the shot (in {lang}).
7. 'characters': Return ONLY IDs from provided Characters list.
8. 'props': Return ONLY IDs from provided Props list when a prop is visibly involved. Use [] if none.
9. 'visualPrompt': Detailed description for image generation in {visualStyle} style (OUTPUT IN {lang}). Include style-specific keywords.{artDirectionVisualPromptConstraint} Keep it under 50 words.

Output ONLY a valid JSON OBJECT with this exact structure (no markdown, no extra text):
{
  "shots": [
    {
      "id": "string",
      "sceneId": "{sceneId}",
      "actionSummary": "string",
      "dialogue": "string (empty if none)",
      "cameraMovement": "string",
      "shotSize": "string",
      "characters": ["string"],
      "props": ["string"],
      "keyframes": [
        {"id": "string", "type": "start|end", "visualPrompt": "string (MUST include {visualStyle} style keywords{keyframeVisualPromptConstraint})"}
      ]
    }
  ]
}`,
    shotRepair: `You previously returned {actualShots} shots for Scene {sceneIndex}, but EXACTLY {shotsPerScene} shots are required.

Scene Details:
Location: {sceneLocation}
Time: {sceneTime}
Atmosphere: {sceneAtmosphere}

Scene Action:
"{sceneAction}"

Requirements:
1. Return EXACTLY {shotsPerScene} shots in JSON object format: {"shots":[...]}.
2. Keep story continuity and preserve the original cinematic intent.
3. Each shot represents about {shotDurationSeconds} seconds.
4. Include fields: id, sceneId, actionSummary, dialogue, cameraMovement, shotSize, characters, props, keyframes.
5. characters/props must be arrays of valid IDs from provided context.
6. keyframes must include type=start/end and visualPrompt.
7. Output ONLY valid JSON object (no markdown).`,
  },
  keyframe: {
    startFrameGuide: `【起始帧要求】建立清晰的初始状态和场景氛围,人物/物体的起始位置、姿态和表情要明确,为后续运动预留视觉空间和动势。`,
    endFrameGuide: `【结束帧要求】展现动作完成后的最终状态,人物/物体的终点位置、姿态和情绪变化,体现镜头运动带来的视角变化。`,
    characterConsistencyGuide: `【角色一致性要求】CHARACTER CONSISTENCY REQUIREMENTS - CRITICAL
⚠️ 如果提供了角色参考图,画面中的人物外观必须严格遵循参考图:
• 面部特征: 五官轮廓、眼睛颜色和形状、鼻子和嘴巴的结构必须完全一致
• 发型发色: 头发的长度、颜色、质感、发型样式必须保持一致
• 服装造型: 服装的款式、颜色、材质、配饰必须与参考图匹配
• 体型特征: 身材比例、身高体型必须保持一致
⚠️ 这是最高优先级要求,不可妥协!`,
    propWithImageGuide: `⚠️ 以下道具已提供参考图,画面中出现时必须严格遵循参考图:
• 外形特征: 道具的形状、大小、比例必须与参考图一致
• 颜色材质: 颜色、材质、纹理必须保持一致
• 细节元素: 图案、文字、装饰细节必须与参考图匹配
⚠️ 这是高优先级要求!

有参考图的道具:
{propList}`,
    propWithoutImageGuide: `以下道具无参考图,请根据文字描述准确呈现:
{propList}`,
    nineGridSourceMeta: `【来源】网格分镜预览 - {sourceLabel}
【景别】{shotSize}
【机位角度】{cameraAngle}
【原始动作】{actionSummary}`,
  },
  nineGrid: {
    splitSystem: `你是专业分镜师。请把同一镜头拆成{panelCount}个不重复视角，用于{gridLayout}网格分镜。保持同一场景与角色连续性。`,
    splitUser: `请将以下镜头动作拆解为{panelCount}个不同的摄影视角，用于生成一张{gridLayout}网格分镜图。

【镜头动作】{actionSummary}
【原始镜头运动】{cameraMovement}
【场景信息】地点: {location}, 时间: {time}, 氛围: {atmosphere}
【角色】{characters}
【视觉风格】{visualStyle}

输出规则（只输出JSON）：
1) 顶层为 {"panels":[...]}
2) panels 必须恰好{panelCount}项，index=0-{lastIndex}，顺序为左到右、上到下
3) 每项含 shotSize、cameraAngle、description，均不能为空
4) shotSize/cameraAngle 用简短中文；description 用英文单句（10-30词），聚焦主体、动作、构图`,
    imagePrefix: `Create ONE cinematic storyboard image in a {gridLayout} grid ({panelCount} equal panels, thin white separators).
All panels depict the SAME scene; vary camera angle and shot size only.
Style: {visualStyle}
Panels (left-to-right, top-to-bottom):`,
    imagePanelTemplate: `Panel {index} ({position}): [{shotSize} / {cameraAngle}] - {description}`,
    imageSuffix: `Constraints:
- Output one single {gridLayout} grid image only
- Keep character identity consistent across all panels
- Keep lighting/color/mood consistent across all panels
- Each panel is a complete cinematic keyframe
- ABSOLUTE NO-TEXT RULE: include zero readable text in every panel
- Forbidden text elements: letters, words, numbers, subtitles, captions, logos, watermarks, signage, UI labels, speech bubbles
- If signs/screens/documents appear, render text areas as blank or illegible marks with no recognizable characters`,
  },
  video: {
    sora2Chinese: `基于提供的参考图片生成视频。
动作描述：{actionSummary}
视觉风格锚点：{visualStyle}

技术要求：
- 关键：视频必须从参考图的精确构图和画面内容开始，再自然发展后续动作
- 镜头运动：{cameraMovement}
- 运动：确保动作流畅自然，避免突兀跳变或不连续
- 视觉风格：电影质感，保持一致的光照与色调
- 细节：角色外观和场景环境需全程一致
- 音频：允许使用{language}配音/旁白
- 文本限制：禁止字幕及任何画面文字（含片头片尾字卡、UI叠字）`,
    sora2English: `Generate a video based on the provided reference image.

Action Description: {actionSummary}
Visual Style Anchor: {visualStyle}

Technical Requirements:
- CRITICAL: The video MUST begin with the exact composition and content of the reference image, then naturally develop the subsequent action
- Camera Movement: {cameraMovement}
- Motion: Ensure smooth and natural movement, avoid abrupt jumps or discontinuities
- Visual Style: Cinematic quality with consistent lighting and color tone throughout
- Details: Maintain character appearance and scene environment consistency throughout
- Audio: Voiceover/narration in {language} is allowed
- Text constraints: No subtitles and no on-screen text (including title cards and UI text overlays)`,
    sora2NineGridChinese: `⚠️ 最高优先级指令：参考图是{gridLayout}网格分镜板（共{panelCount}格），仅用于镜头顺序参考，严禁作为视频可见内容。
⚠️ 视频第一帧必须是面板1的全屏场景画面（单画面占满100%屏幕）。
⚠️ 绝对禁止：网格原图、网格线、缩略图拼贴、多画面分屏、画中画、多窗口并行动画。

动作描述：{actionSummary}
视觉风格锚点：{visualStyle}

网格镜头顺序（参考图从左到右、从上到下）：
{panelDescriptions}

镜头切换必须按1→{panelCount}顺序逐个出现；任意时刻只允许一个全屏镜头，禁止多个面板同时运动。
每个视角约{secondsPerPanel}秒，可用硬切或自然转场，镜头运动：{cameraMovement}
保持角色外观一致与电影质感。可{language}配音/旁白，但禁止字幕与任何画面文字。`,
    sora2NineGridEnglish: `⚠️ HIGHEST PRIORITY: The reference image is a {gridLayout} storyboard grid ({panelCount} panels), used ONLY as shot-order guidance and NEVER as visible video content.
⚠️ The first frame MUST be the full-screen scene from Panel 1 (a single shot occupying 100% of the frame).
⚠️ FORBIDDEN: grid image, grid lines, thumbnail collage, split-screen, picture-in-picture, multi-window, or parallel panel animation.

Action: {actionSummary}
Visual Style Anchor: {visualStyle}

Storyboard shot sequence (reference grid, left-to-right, top-to-bottom):
{panelDescriptions}

Transition strictly in order 1→{panelCount}, one shot at a time; never animate multiple panels simultaneously.
~{secondsPerPanel}s per angle using hard cuts or motivated transitions. Camera: {cameraMovement}
Maintain character consistency, cinematic quality.
Voiceover in {language} is allowed, but no subtitles or any on-screen text.`,
    veoStartOnly: `Use the provided start frame as the exact opening composition.
Action: {actionSummary}
Camera Movement: {cameraMovement}
Visual Style Anchor: {visualStyle}
Language: {language}
Keep identity, scene lighting, and prop details consistent throughout the shot.`,
    veoStartEnd: `Use the provided START and END frames as hard constraints.
Action: {actionSummary}
Camera Movement: {cameraMovement}
Visual Style Anchor: {visualStyle}
Language: {language}
The video must start from the start frame composition and progress naturally to a final state that matches the end frame.`,
  },
};

export type PromptTemplateCategory = keyof PromptTemplateConfig;

export type PromptTemplatePath =
  | 'storyboard.shotGeneration'
  | 'storyboard.shotRepair'
  | 'keyframe.startFrameGuide'
  | 'keyframe.endFrameGuide'
  | 'keyframe.characterConsistencyGuide'
  | 'keyframe.propWithImageGuide'
  | 'keyframe.propWithoutImageGuide'
  | 'keyframe.nineGridSourceMeta'
  | 'nineGrid.splitSystem'
  | 'nineGrid.splitUser'
  | 'nineGrid.imagePrefix'
  | 'nineGrid.imagePanelTemplate'
  | 'nineGrid.imageSuffix'
  | 'video.sora2Chinese'
  | 'video.sora2English'
  | 'video.sora2NineGridChinese'
  | 'video.sora2NineGridEnglish'
  | 'video.veoStartOnly'
  | 'video.veoStartEnd';

export interface PromptTemplateFieldDefinition {
  path: PromptTemplatePath;
  category: PromptTemplateCategory;
  title: string;
  description: string;
  placeholders: string[];
}

export const PROMPT_TEMPLATE_FIELD_DEFINITIONS: PromptTemplateFieldDefinition[] = [
  {
    path: 'storyboard.shotGeneration',
    category: 'storyboard',
    title: '分镜生成主提示词',
    description: '用于生成场景分镜列表的主模板。',
    placeholders: [
      'sceneIndex',
      'lang',
      'visualStyle',
      'sceneLocation',
      'sceneAction',
      'shotsPerScene',
    ],
  },
  {
    path: 'storyboard.shotRepair',
    category: 'storyboard',
    title: '分镜纠偏提示词',
    description: '当分镜数量不符时触发的自动纠偏模板。',
    placeholders: ['actualShots', 'sceneIndex', 'shotsPerScene', 'sceneAction'],
  },
  {
    path: 'keyframe.startFrameGuide',
    category: 'keyframe',
    title: '首帧约束',
    description: '生成首帧提示词时附加的要求。',
    placeholders: [],
  },
  {
    path: 'keyframe.endFrameGuide',
    category: 'keyframe',
    title: '尾帧约束',
    description: '生成尾帧提示词时附加的要求。',
    placeholders: [],
  },
  {
    path: 'keyframe.characterConsistencyGuide',
    category: 'keyframe',
    title: '角色一致性约束',
    description: '首尾帧都使用的角色一致性规则块。',
    placeholders: [],
  },
  {
    path: 'keyframe.propWithImageGuide',
    category: 'keyframe',
    title: '有图道具一致性约束',
    description: '道具带参考图时的约束模板。',
    placeholders: ['propList'],
  },
  {
    path: 'keyframe.propWithoutImageGuide',
    category: 'keyframe',
    title: '无图道具描述约束',
    description: '道具无参考图时的文字约束模板。',
    placeholders: ['propList'],
  },
  {
    path: 'keyframe.nineGridSourceMeta',
    category: 'keyframe',
    title: '九宫格首帧来源描述',
    description: '从网格面板生成首帧时写入的来源元信息。',
    placeholders: ['sourceLabel', 'shotSize', 'cameraAngle', 'actionSummary'],
  },
  {
    path: 'nineGrid.splitSystem',
    category: 'nineGrid',
    title: '九宫格拆分 System 模板',
    description: '网格拆分第一步使用的系统提示词。',
    placeholders: ['panelCount', 'gridLayout'],
  },
  {
    path: 'nineGrid.splitUser',
    category: 'nineGrid',
    title: '九宫格拆分 User 模板',
    description: '网格拆分第一步使用的用户提示词。',
    placeholders: [
      'panelCount',
      'gridLayout',
      'actionSummary',
      'cameraMovement',
      'characters',
      'visualStyle',
    ],
  },
  {
    path: 'nineGrid.imagePrefix',
    category: 'nineGrid',
    title: '九宫格图片前缀模板',
    description: '网格图片生成提示词前缀。',
    placeholders: ['gridLayout', 'panelCount', 'visualStyle'],
  },
  {
    path: 'nineGrid.imagePanelTemplate',
    category: 'nineGrid',
    title: '九宫格单格模板',
    description: '每个面板拼接时的模板。',
    placeholders: ['index', 'position', 'shotSize', 'cameraAngle', 'description'],
  },
  {
    path: 'nineGrid.imageSuffix',
    category: 'nineGrid',
    title: '九宫格图片后缀模板',
    description: '网格图片生成提示词后缀。',
    placeholders: ['gridLayout', 'panelCount'],
  },
  {
    path: 'video.sora2Chinese',
    category: 'video',
    title: '视频模板-Sora 中文',
    description: '普通模式下中文视频提示词模板。',
    placeholders: ['actionSummary', 'cameraMovement', 'visualStyle', 'language'],
  },
  {
    path: 'video.sora2English',
    category: 'video',
    title: '视频模板-Sora 英文',
    description: '普通模式下英文视频提示词模板。',
    placeholders: ['actionSummary', 'cameraMovement', 'visualStyle', 'language'],
  },
  {
    path: 'video.sora2NineGridChinese',
    category: 'video',
    title: '视频模板-九宫格中文',
    description: '网格分镜模式下中文视频提示词模板。',
    placeholders: [
      'actionSummary',
      'visualStyle',
      'gridLayout',
      'panelCount',
      'panelDescriptions',
      'secondsPerPanel',
      'cameraMovement',
      'language',
    ],
  },
  {
    path: 'video.sora2NineGridEnglish',
    category: 'video',
    title: '视频模板-九宫格英文',
    description: '网格分镜模式下英文视频提示词模板。',
    placeholders: [
      'actionSummary',
      'visualStyle',
      'gridLayout',
      'panelCount',
      'panelDescriptions',
      'secondsPerPanel',
      'cameraMovement',
      'language',
    ],
  },
  {
    path: 'video.veoStartOnly',
    category: 'video',
    title: '视频模板-Veo 首帧模式',
    description: '仅首帧驱动时使用的模板。',
    placeholders: ['actionSummary', 'cameraMovement', 'visualStyle', 'language'],
  },
  {
    path: 'video.veoStartEnd',
    category: 'video',
    title: '视频模板-Veo 首尾帧模式',
    description: '首尾帧双约束模式使用的模板。',
    placeholders: ['actionSummary', 'cameraMovement', 'visualStyle', 'language'],
  },
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const sanitizeSection = <T extends Record<string, string>>(
  input: unknown,
  defaults: T
): Partial<T> | undefined => {
  if (!isObject(input)) return undefined;
  const sanitized: Partial<T> = {};
  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const value = input[String(key)];
    if (typeof value === 'string') {
      sanitized[key] = value;
    }
  });
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

export const sanitizePromptTemplateOverrides = (
  overrides?: PromptTemplateOverrides | null
): PromptTemplateOverrides | undefined => {
  if (!isObject(overrides)) return undefined;

  const storyboard = sanitizeSection(overrides.storyboard, DEFAULT_PROMPT_TEMPLATE_CONFIG.storyboard);
  const keyframe = sanitizeSection(overrides.keyframe, DEFAULT_PROMPT_TEMPLATE_CONFIG.keyframe);
  const nineGrid = sanitizeSection(overrides.nineGrid, DEFAULT_PROMPT_TEMPLATE_CONFIG.nineGrid);
  const video = sanitizeSection(overrides.video, DEFAULT_PROMPT_TEMPLATE_CONFIG.video);

  const normalized: PromptTemplateOverrides = {};
  if (storyboard) normalized.storyboard = storyboard;
  if (keyframe) normalized.keyframe = keyframe;
  if (nineGrid) normalized.nineGrid = nineGrid;
  if (video) normalized.video = video;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const resolvePromptTemplateConfig = (
  overrides?: PromptTemplateOverrides | null
): PromptTemplateConfig => {
  const normalizedOverrides = sanitizePromptTemplateOverrides(overrides);
  return {
    storyboard: {
      ...DEFAULT_PROMPT_TEMPLATE_CONFIG.storyboard,
      ...(normalizedOverrides?.storyboard || {}),
    },
    keyframe: {
      ...DEFAULT_PROMPT_TEMPLATE_CONFIG.keyframe,
      ...(normalizedOverrides?.keyframe || {}),
    },
    nineGrid: {
      ...DEFAULT_PROMPT_TEMPLATE_CONFIG.nineGrid,
      ...(normalizedOverrides?.nineGrid || {}),
    },
    video: {
      ...DEFAULT_PROMPT_TEMPLATE_CONFIG.video,
      ...(normalizedOverrides?.video || {}),
    },
  };
};

const splitPromptTemplatePath = (
  path: PromptTemplatePath
): [PromptTemplateCategory, string] => {
  const [category, key] = path.split('.') as [PromptTemplateCategory, string];
  return [category, key];
};

export const getPromptTemplateValueByPath = (
  config: PromptTemplateConfig,
  path: PromptTemplatePath
): string => {
  const [category, key] = splitPromptTemplatePath(path);
  const section = config[category] as Record<string, string>;
  return section[key] || '';
};

export const getDefaultPromptTemplateValue = (path: PromptTemplatePath): string => {
  return getPromptTemplateValueByPath(DEFAULT_PROMPT_TEMPLATE_CONFIG, path);
};

export const hasPromptTemplateOverride = (
  overrides: PromptTemplateOverrides | undefined,
  path: PromptTemplatePath
): boolean => {
  const normalized = sanitizePromptTemplateOverrides(overrides);
  if (!normalized) return false;
  const [category, key] = splitPromptTemplatePath(path);
  return typeof (normalized[category] as Record<string, string> | undefined)?.[key] === 'string';
};

export const setPromptTemplateOverride = (
  overrides: PromptTemplateOverrides | undefined,
  path: PromptTemplatePath,
  value: string
): PromptTemplateOverrides => {
  const normalized = sanitizePromptTemplateOverrides(overrides) || {};
  const [category, key] = splitPromptTemplatePath(path);
  const nextSection = {
    ...((normalized[category] as Record<string, string>) || {}),
    [key]: value,
  };
  const next: PromptTemplateOverrides = {
    ...normalized,
    [category]: nextSection,
  };
  return sanitizePromptTemplateOverrides(next) || {};
};

export const removePromptTemplateOverride = (
  overrides: PromptTemplateOverrides | undefined,
  path: PromptTemplatePath
): PromptTemplateOverrides | undefined => {
  const normalized = sanitizePromptTemplateOverrides(overrides);
  if (!normalized) return undefined;

  const [category, key] = splitPromptTemplatePath(path);
  const currentSection = { ...((normalized[category] as Record<string, string>) || {}) };
  delete currentSection[key];

  const next: PromptTemplateOverrides = {
    ...normalized,
  };

  if (Object.keys(currentSection).length === 0) {
    delete next[category];
  } else {
    next[category] = currentSection as any;
  }

  return sanitizePromptTemplateOverrides(next);
};

export const searchPromptTemplateFields = (
  config: PromptTemplateConfig,
  query: string
): PromptTemplateFieldDefinition[] => {
  const keyword = String(query || '').trim().toLowerCase();
  if (!keyword) return PROMPT_TEMPLATE_FIELD_DEFINITIONS;

  return PROMPT_TEMPLATE_FIELD_DEFINITIONS.filter((field) => {
    const currentValue = getPromptTemplateValueByPath(config, field.path).toLowerCase();
    return (
      field.title.toLowerCase().includes(keyword) ||
      field.description.toLowerCase().includes(keyword) ||
      field.path.toLowerCase().includes(keyword) ||
      field.category.toLowerCase().includes(keyword) ||
      currentValue.includes(keyword)
    );
  });
};

export const getPromptTemplateCategoryLabel = (category: PromptTemplateCategory): string => {
  switch (category) {
    case 'storyboard':
      return '分镜';
    case 'keyframe':
      return '首尾帧';
    case 'nineGrid':
      return '九宫格';
    case 'video':
      return '视频';
    default:
      return category;
  }
};

export const renderPromptTemplate = (
  template: string,
  variables: Record<string, string | number | undefined | null>
): string => {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      return `{${key}}`;
    }
    return String(value);
  });
};

export const withTemplateFallback = (
  candidate: string | undefined | null,
  fallback: string
): string => {
  const value = String(candidate ?? '');
  return value.trim().length > 0 ? value : fallback;
};

export const getStoryboardCameraMovementReference = (): string => CAMERA_MOVEMENT_REFERENCE;
