import type { VideoResult, ConvertFormat } from '@/types';
import { VideoCard, type ConvertStatus } from './VideoCard';

type ResultsGridProps = {
  videos: VideoResult[];
  /** videoId → 변환 상태. 없으면 'idle'. */
  statuses: Record<string, ConvertStatus>;
  onConvert: (videoId: string, format: ConvertFormat, title: string) => void;
};

export function ResultsGrid({ videos, statuses, onConvert }: ResultsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-card sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <VideoCard
          key={v.videoId}
          video={v}
          convertStatus={statuses[v.videoId] ?? 'idle'}
          onConvert={onConvert}
        />
      ))}
    </div>
  );
}
