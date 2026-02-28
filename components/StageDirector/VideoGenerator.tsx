import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Video, Loader2, Edit2, Mic, Trash2 } from 'lucide-react';
import { Shot, AspectRatio, VideoDuration, DubbingMode } from '../../types';
import { VideoSettingsPanel } from '../AspectRatioSelector';
import { resolveVideoModelRouting } from './utils';
import { 
  getDefaultAspectRatio, 
  getDefaultVideoDuration,
  getVideoModels,
  getActiveVideoModel,
  getAudioModels,
  getActiveAudioModel,
  getProviderById,
} from '../../services/modelRegistry';
import { VideoModelDefinition, AudioModelDefinition } from '../../types/model';
import { useResolvedVideoUrl } from '../../hooks/useResolvedVideoUrl';

interface VideoGeneratorProps {
  shot: Shot;
  hasStartFrame: boolean;
  hasEndFrame: boolean;
  onGenerate: (aspectRatio: AspectRatio, duration: VideoDuration, modelId: string) => void;
  onGenerateDubbing: (mode: DubbingMode, text: string, modelId?: string) => void;
  onClearDubbing: () => void;
  onEditPrompt: () => void;
  onModelChange?: (modelId: string) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  shot,
  hasStartFrame,
  hasEndFrame,
  onGenerate,
  onGenerateDubbing,
  onClearDubbing,
  onEditPrompt,
  onModelChange
}) => {
  const normalizeModelId = (modelId?: string) => {
    if (!modelId) return modelId;
    const normalized = modelId.toLowerCase();
    if (normalized === 'veo_3_1-fast-4k') return 'veo_3_1-fast';
    // Legacy Veo sync aliases are migrated to Veo Fast after removing Veo 3.1 sync preset.
    if (
      normalized === 'veo' ||
      normalized === 'veo-r2v' ||
      normalized === 'veo_3_1' ||
      normalized.startsWith('veo_3_0_r2v')
    ) {
      return 'veo_3_1-fast';
    }
    return modelId;
  };

  const resolveVeoFastQuality = (modelId?: string): 'standard' | '4k' => {
    if (!modelId) return 'standard';
    return modelId.toLowerCase() === 'veo_3_1-fast-4k' ? '4k' : 'standard';
  };

  // 获取可用的视频模型
  const videoModels = getVideoModels().filter(m => m.isEnabled);
  const defaultModel = getActiveVideoModel();
  
  // 状态（废弃模型已在数据加载层迁移，此处无需额外处理）
  const [selectedModelId, setSelectedModelId] = useState<string>(
    normalizeModelId(shot.videoModel) || defaultModel?.id || videoModels[0]?.id || 'sora-2'
  );
  const [veoFastQuality, setVeoFastQuality] = useState<'standard' | '4k'>(
    resolveVeoFastQuality(shot.videoModel)
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() => getDefaultAspectRatio());
  const [duration, setDuration] = useState<VideoDuration>(() => getDefaultVideoDuration());
  
  // 当前选中的模型
  const selectedModel = videoModels.find(m => m.id === selectedModelId) as VideoModelDefinition | undefined;
  const selectedProvider = selectedModel ? getProviderById(selectedModel.providerId) : undefined;
  const requiresDedicatedApiKey = selectedModel?.providerId === 'volcengine';
  const hasDedicatedApiKey = Boolean(
    (selectedModel?.apiKey && selectedModel.apiKey.trim()) ||
    (selectedProvider?.apiKey && selectedProvider.apiKey.trim())
  );
  const isMissingVolcengineApiKey = Boolean(requiresDedicatedApiKey && !hasDedicatedApiKey);
  const modelType: 'sora' | 'veo' = selectedModel?.params.mode === 'async' ? 'sora' : 'veo';
  const effectiveModelId = selectedModelId === 'veo_3_1-fast'
    ? (veoFastQuality === '4k' ? 'veo_3_1-fast-4K' : 'veo_3_1-fast')
    : selectedModelId;
  const modelRouting = resolveVideoModelRouting(effectiveModelId || selectedModelId || 'sora-2');
  const routingLabel =
    modelRouting.family === 'sora'
      ? 'Sora'
      : modelRouting.family === 'doubao-task'
        ? 'Doubao Task'
        : modelRouting.family === 'veo-fast'
          ? 'Veo Fast'
          : 'Unknown';
  const getRecommendedModeLabel = (modelId: string): string => {
    const routing = resolveVideoModelRouting(modelId);
    if (routing.family === 'sora' || routing.family === 'doubao-task') {
      return '推荐网格分镜';
    }
    if (routing.family === 'veo-fast') {
      return '网格/首尾帧';
    }
    return '按镜头选择';
  };
  
  const isGenerating = shot.interval?.status === 'generating';
  const hasVideo = !!shot.interval?.videoUrl;
  const resolvedVideoSrc = useResolvedVideoUrl(shot.interval?.videoUrl);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const dubbingPreviewRef = useRef<HTMLAudioElement | null>(null);

  // 配音模型与状态
  const audioModels = getAudioModels().filter((m) => m.isEnabled);
  const activeAudioModel = getActiveAudioModel();
  const [dubbingMode, setDubbingMode] = useState<DubbingMode>(shot.dubbing?.mode || 'narration');
  const [selectedAudioModelId, setSelectedAudioModelId] = useState<string>(
    shot.dubbing?.modelId || activeAudioModel?.id || audioModels[0]?.id || 'gpt-audio-1.5'
  );
  const [dubbingText, setDubbingText] = useState<string>(shot.dubbing?.text || '');
  const isGeneratingDubbing = shot.dubbing?.status === 'generating';
  const hasDubbingAudio = !!shot.dubbing?.audioUrl;
  const resolvedDubbingModel = audioModels.find((m) => m.id === selectedAudioModelId) as AudioModelDefinition | undefined;
  const fallbackDubbingText = useMemo(
    () => (dubbingMode === 'dialogue' ? (shot.dialogue || '') : (shot.actionSummary || '')).trim(),
    [dubbingMode, shot.dialogue, shot.actionSummary]
  );
  const canGenerateDubbing = dubbingText.trim().length > 0 && !!selectedAudioModelId && !isGeneratingDubbing;

  // 当模型变化时，更新横竖屏和时长的默认值
  useEffect(() => {
    if (selectedModel) {
      // 如果当前选择的横竖屏不被新模型支持，切换到默认值
      if (!selectedModel.params.supportedAspectRatios.includes(aspectRatio)) {
        setAspectRatio(selectedModel.params.defaultAspectRatio);
      }
      // 如果当前选择的时长不被新模型支持，切换到默认值
      if (!selectedModel.params.supportedDurations.includes(duration)) {
        setDuration(selectedModel.params.defaultDuration);
      }
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (!shot.videoModel) return;
    setSelectedModelId(normalizeModelId(shot.videoModel));
    setVeoFastQuality(resolveVeoFastQuality(shot.videoModel));
  }, [shot.videoModel]);

  useEffect(() => {
    const initialMode = shot.dubbing?.mode || 'narration';
    const initialModelId = shot.dubbing?.modelId || activeAudioModel?.id || audioModels[0]?.id || 'gpt-audio-1.5';
    const initialText = (shot.dubbing?.text || (initialMode === 'dialogue' ? shot.dialogue : shot.actionSummary) || '').trim();
    setDubbingMode(initialMode);
    setSelectedAudioModelId(initialModelId);
    setDubbingText(initialText);
  }, [shot.id, activeAudioModel?.id]);

  const handleGenerate = () => {
    onGenerate(aspectRatio, duration, effectiveModelId);
  };

  const handleVeoFastQualityChange = (quality: 'standard' | '4k') => {
    setVeoFastQuality(quality);
    if (selectedModelId === 'veo_3_1-fast') {
      const modelId = quality === '4k' ? 'veo_3_1-fast-4K' : 'veo_3_1-fast';
      onModelChange?.(modelId);
    }
  };

  const canGenerate = hasStartFrame && !isMissingVolcengineApiKey;

  const handleGenerateDubbing = () => {
    if (!canGenerateDubbing) return;
    onGenerateDubbing(dubbingMode, dubbingText.trim(), selectedAudioModelId);
  };

  const handleSyncPreviewPlayback = async () => {
    const videoEl = videoPreviewRef.current;
    const audioEl = dubbingPreviewRef.current;
    if (!videoEl || !audioEl) return;

    try {
      videoEl.currentTime = 0;
      audioEl.currentTime = 0;
      await Promise.all([videoEl.play(), audioEl.play()]);
    } catch (error) {
      // 浏览器策略可能阻止自动播放，保留控件让用户手动播放
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-primary)] space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
          <Video className="w-3 h-3 text-[var(--accent)]" />
          视频生成
          <button 
            onClick={onEditPrompt}
            className="p-1 text-[var(--warning-text)] hover:text-[var(--text-primary)] transition-colors"
            title="预览/编辑视频提示词"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </h4>
        {shot.interval?.status === 'completed' && (
          <span className="text-[10px] text-[var(--success)] font-mono flex items-center gap-1">
            ● READY
          </span>
        )}
      </div>
      
      {/* Model Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block">
          选择视频模型
        </label>
        <select
          value={selectedModelId}
          onChange={(e) => {
            const newModelId = e.target.value;
            setSelectedModelId(newModelId);
            const resolvedModelId = newModelId === 'veo_3_1-fast'
              ? (veoFastQuality === '4k' ? 'veo_3_1-fast-4K' : 'veo_3_1-fast')
              : newModelId;
            onModelChange?.(resolvedModelId);
          }}
          className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--accent)] transition-colors"
          disabled={isGenerating}
        >
          {videoModels.map((model) => {
            const vm = model as VideoModelDefinition;
            const modeLabel = vm.params.mode === 'async' ? '异步' : '同步';
            const recommendationLabel = getRecommendedModeLabel(model.id);
            return (
              <option key={model.id} value={model.id}>
                {model.name}（{modeLabel} · {recommendationLabel}）
              </option>
            );
          })}
        </select>
        {selectedModel && (
          <p className="text-[9px] text-[var(--text-muted)] font-mono">
            ✦ {selectedModel.name}: 
            {selectedModel.params.mode === 'async' 
              ? ` 支持 ${selectedModel.params.supportedAspectRatios.join('/')}，可选 ${selectedModel.params.supportedDurations.join('/')}秒`
              : ` 同步模式，支持 ${selectedModel.params.supportedAspectRatios.join('/')}`
            }
            {` ｜${getRecommendedModeLabel(effectiveModelId || selectedModel.id)}`}
          </p>
        )}
        {isMissingVolcengineApiKey && (
          <div className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2">
            <p className="text-[10px] text-[var(--error-text)] font-bold">
              当前模型需要火山引擎专用 API Key
            </p>
            <p className="text-[9px] text-[var(--error-text)]/90 mt-1">
              未检测到该模型或 Volcengine 提供商的 Key。此模型不会使用 AntSK 全局 Key，请先到模型配置里设置后再生成。
            </p>
          </div>
        )}
        <div className="bg-[var(--bg-base)] border border-[var(--border-secondary)] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              模型能力卡
            </span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {routingLabel}
            </span>
          </div>
          {[
            {
              key: 'start-only',
              label: '首帧支持',
              enabled: modelRouting.supportsStartFrame,
            },
            {
              key: 'start-end',
              label: '首尾帧支持',
              enabled: modelRouting.supportsStartFrame && modelRouting.supportsEndFrame,
            },
            {
              key: 'nine-grid-priority',
              label: '九宫格优先',
              enabled: modelRouting.prefersNineGridStoryboard,
            },
          ].map((capability) => (
            <div key={capability.key} className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)]">{capability.label}</span>
              <span
                className={`px-2 py-0.5 rounded border font-mono ${
                  capability.enabled
                    ? 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/10'
                    : 'text-[var(--text-muted)] border-[var(--border-primary)] bg-[var(--bg-hover)]'
                }`}
              >
                {capability.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
          {hasEndFrame && !modelRouting.supportsEndFrame && (
            <p className="text-[9px] text-[var(--warning-text)] font-mono">
              当前模型会自动忽略尾帧输入，仅使用首帧驱动。
            </p>
          )}
        </div>
        {selectedModelId === 'veo_3_1-fast' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase">清晰度</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleVeoFastQualityChange('standard')}
                disabled={isGenerating}
                className={`
                  px-3 py-1.5 rounded-md text-xs transition-all
                  ${veoFastQuality === 'standard'
                    ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:bg-[var(--border-secondary)] hover:text-[var(--text-secondary)]'
                  }
                  ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                标准
              </button>
              <button
                onClick={() => handleVeoFastQualityChange('4k')}
                disabled={isGenerating}
                className={`
                  px-3 py-1.5 rounded-md text-xs transition-all
                  ${veoFastQuality === '4k'
                    ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:bg-[var(--border-secondary)] hover:text-[var(--text-secondary)]'
                  }
                  ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                4K
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 视频设置：横竖屏 & 时长 */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block">
          视频设置
        </label>
        <VideoSettingsPanel
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          duration={duration}
          onDurationChange={setDuration}
          modelType={modelType}
          disabled={isGenerating}
          supportedAspectRatios={selectedModel?.params.supportedAspectRatios}
          supportedDurations={selectedModel?.params.supportedDurations}
        />
      </div>
      
      {/* Video Preview */}
      {hasVideo ? (
        <div className="w-full aspect-video bg-[var(--bg-base)] rounded-lg overflow-hidden border border-[var(--border-secondary)] relative shadow-lg">
          <video ref={videoPreviewRef} src={resolvedVideoSrc} controls className="w-full h-full" />
        </div>
      ) : (
        <div className="w-full aspect-video bg-[var(--nav-hover-bg)] rounded-lg border border-dashed border-[var(--border-primary)] flex items-center justify-center">
          <span className="text-xs text-[var(--text-muted)] font-mono">PREVIEW AREA</span>
        </div>
      )}

      {/* Dubbing Panel */}
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-base)] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-2">
            <Mic className="w-3 h-3 text-[var(--accent)]" />
            配音
          </h5>
          {shot.dubbing?.status === 'completed' && (
            <span className="text-[9px] text-[var(--success)] font-mono">● READY</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setDubbingMode('narration');
              if (!shot.dubbing?.text || dubbingMode !== 'narration') {
                setDubbingText((shot.actionSummary || '').trim());
              }
            }}
            className={`px-2 py-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
              dubbingMode === 'narration'
                ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-text)]'
                : 'border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            disabled={isGeneratingDubbing}
          >
            旁白
          </button>
          <button
            type="button"
            onClick={() => {
              setDubbingMode('dialogue');
              if (!shot.dubbing?.text || dubbingMode !== 'dialogue') {
                setDubbingText((shot.dialogue || '').trim());
              }
            }}
            className={`px-2 py-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
              dubbingMode === 'dialogue'
                ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-text)]'
                : 'border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            disabled={isGeneratingDubbing}
          >
            对话
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block">
            选择配音模型
          </label>
          <select
            value={selectedAudioModelId}
            onChange={(e) => setSelectedAudioModelId(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
            disabled={isGeneratingDubbing}
          >
            {audioModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-[var(--text-muted)]">
            {resolvedDubbingModel
              ? `默认音色 ${resolvedDubbingModel.params.defaultVoice} · 输出 ${resolvedDubbingModel.params.outputFormat}`
              : '请先在模型配置中启用配音模型'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
              配音文本
            </label>
            <button
              type="button"
              onClick={() => setDubbingText(fallbackDubbingText)}
              className="text-[9px] text-[var(--accent-text)] hover:text-[var(--text-primary)]"
              disabled={isGeneratingDubbing}
            >
              使用建议文本
            </button>
          </div>
          <textarea
            value={dubbingText}
            onChange={(e) => setDubbingText(e.target.value)}
            rows={3}
            placeholder={dubbingMode === 'dialogue' ? '请输入对话文本' : '请输入旁白文本'}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] resize-y min-h-[72px]"
            disabled={isGeneratingDubbing}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateDubbing}
            disabled={!canGenerateDubbing || !audioModels.length}
            className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGeneratingDubbing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                生成中...
              </>
            ) : (
              <>生成配音</>
            )}
          </button>
          {shot.dubbing && (
            <button
              type="button"
              onClick={onClearDubbing}
              disabled={isGeneratingDubbing}
              className="px-3 py-2 rounded-lg border border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="清除当前配音"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {shot.dubbing?.error && (
          <p className="text-[9px] text-[var(--error-text)]">{shot.dubbing.error}</p>
        )}

        {hasDubbingAudio && (
          <div className="space-y-2">
            <audio ref={dubbingPreviewRef} src={shot.dubbing?.audioUrl} controls className="w-full" />
            {hasVideo && (
              <button
                type="button"
                onClick={handleSyncPreviewPlayback}
                className="w-full py-2 rounded-lg border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider"
              >
                同步试听（视频 + 配音）
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
          hasVideo 
            ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-secondary)]'
            : 'bg-[var(--accent)] text-[var(--text-primary)] hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent-shadow)]'
        } ${(!canGenerate) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {`生成视频中 (${aspectRatio}, ${modelType === 'sora' ? `${duration}秒` : selectedModel?.name})...`}
          </>
        ) : (
          <>{hasVideo ? '重新生成视频' : '开始生成视频'}</>
        )}
      </button>
      {isMissingVolcengineApiKey && (
        <div className="text-[9px] text-[var(--error-text)] text-center font-mono">
          * 请选择并配置火山引擎 API Key（模型 Key 或 Volcengine 提供商 Key）
        </div>
      )}
      
      {/* Status Messages */}
      {!hasEndFrame && (
        <div className="text-[9px] text-[var(--text-tertiary)] text-center font-mono">
          * 未检测到结束帧，将使用单图生成模式 (Image-to-Video)
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
