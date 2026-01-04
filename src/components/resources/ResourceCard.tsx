/**
 * Resource Card Component
 * 
 * Displays a resource in a card format.
 */

import { Component, Show, createMemo } from 'solid-js';
import type { Resource } from '../../types';
import { getResourceTypeIcon, getResourceTypeName } from '../../lib/detection/detector';
import { resourceActions } from '../../lib/stores';
import { 
  HeartIcon, 
  HeartFilledIcon, 
  ExternalLinkIcon, 
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  ArchiveIcon,
  RefreshIcon,
} from '../ui/icons';
import { Badge } from '../ui/Badge';

export interface ResourceCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
  view?: 'grid' | 'list' | 'compact';
}

export const ResourceCard: Component<ResourceCardProps> = (props) => {
  const view = () => props.view || 'grid';
  
  const thumbnailUrl = createMemo(() => {
    const thumb = props.resource.thumbnailUrl;
    if (!thumb) return null;
    // Use a proxy for external images to avoid CORS issues
    return thumb;
  });

  const typeIcon = createMemo(() => getResourceTypeIcon(props.resource.type));
  const typeName = createMemo(() => getResourceTypeName(props.resource.type));

  const handleFavorite = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await resourceActions.toggleFavorite(props.resource.id);
  };

  const handleOpen = () => {
    if (props.resource.url) {
      window.open(props.resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (view() === 'compact') {
    return (
      <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
        <span class="text-xl">{typeIcon()}</span>
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
            {props.resource.title}
          </h3>
          <p class="text-sm text-gray-500 truncate">{typeName()}</p>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavorite}
            class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Show when={props.resource.isFavorite} fallback={<HeartIcon size={16} />}>
              <HeartFilledIcon size={16} class="text-red-500" />
            </Show>
          </button>
          <Show when={props.resource.url}>
            <button
              onClick={handleOpen}
              class="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ExternalLinkIcon size={16} />
            </button>
          </Show>
        </div>
      </div>
    );
  }

  if (view() === 'list') {
    return (
      <div class="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
        {/* Thumbnail */}
        <div class="flex-shrink-0 w-24 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
          <Show when={thumbnailUrl()} fallback={
            <div class="w-full h-full flex items-center justify-center text-2xl">
              {typeIcon()}
            </div>
          }>
            <img 
              src={thumbnailUrl()!} 
              alt={props.resource.title}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </Show>
        </div>

        {/* Content */}
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                {props.resource.title}
              </h3>
              <p class="text-sm text-gray-500 mt-0.5">{typeName()}</p>
            </div>
            <button
              onClick={handleFavorite}
              class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Show when={props.resource.isFavorite} fallback={<HeartIcon size={18} />}>
                <HeartFilledIcon size={18} class="text-red-500" />
              </Show>
            </button>
          </div>
          
          <Show when={props.resource.description}>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {props.resource.description}
            </p>
          </Show>

          <div class="flex items-center gap-2 mt-2">
            <Show when={props.resource.tags.length > 0}>
              {props.resource.tags.slice(0, 3).map((tag) => (
                <Badge size="sm">{tag}</Badge>
              ))}
              <Show when={props.resource.tags.length > 3}>
                <Badge size="sm" variant="default">+{props.resource.tags.length - 3}</Badge>
              </Show>
            </Show>
          </div>
        </div>

        {/* Actions */}
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Show when={props.resource.url}>
            <button
              onClick={handleOpen}
              class="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ExternalLinkIcon size={18} />
            </button>
          </Show>
          <Show when={props.onEdit}>
            <button
              onClick={() => props.onEdit?.(props.resource)}
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <EditIcon size={18} />
            </button>
          </Show>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all group">
      {/* Thumbnail */}
      <div class="aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
        <Show when={thumbnailUrl()} fallback={
          <div class="w-full h-full flex items-center justify-center text-4xl">
            {typeIcon()}
          </div>
        }>
          <img 
            src={thumbnailUrl()!} 
            alt={props.resource.title}
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Show>
        
        {/* Type badge */}
        <div class="absolute top-2 left-2">
          <Badge size="sm" variant="default" class="bg-white/90 dark:bg-gray-800/90">
            <span class="mr-1">{typeIcon()}</span>
            {typeName()}
          </Badge>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          class="absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
        >
          <Show when={props.resource.isFavorite} fallback={<HeartIcon size={18} />}>
            <HeartFilledIcon size={18} class="text-red-500" />
          </Show>
        </button>

        {/* Open button (shown on hover) */}
        <Show when={props.resource.url}>
          <button
            onClick={handleOpen}
            class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div class="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ExternalLinkIcon size={18} />
              Open
            </div>
          </button>
        </Show>
      </div>

      {/* Content */}
      <div class="p-4">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
          {props.resource.title}
        </h3>
        
        <Show when={props.resource.description}>
          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {props.resource.description}
          </p>
        </Show>

        {/* Tags */}
        <Show when={props.resource.tags.length > 0}>
          <div class="flex flex-wrap gap-1">
            {props.resource.tags.slice(0, 3).map((tag) => (
              <Badge size="sm">{tag}</Badge>
            ))}
            <Show when={props.resource.tags.length > 3}>
              <Badge size="sm" variant="default">+{props.resource.tags.length - 3}</Badge>
            </Show>
          </div>
        </Show>
      </div>

      {/* Actions bar */}
      <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-xs text-gray-400">
          {new Date(props.resource.createdAt).toLocaleDateString()}
        </span>
        <div class="flex items-center gap-1">
          <Show when={props.onEdit}>
            <button
              onClick={() => props.onEdit?.(props.resource)}
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <EditIcon size={16} />
            </button>
          </Show>
          <Show when={props.onDelete}>
            <button
              onClick={() => props.onDelete?.(props.resource)}
              class="p-1.5 text-gray-400 hover:text-red-500 rounded"
            >
              <TrashIcon size={16} />
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
