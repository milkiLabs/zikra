/**
 * Add Resource Modal
 * 
 * Modal for adding new resources with auto-detection or manual input.
 */

import { 
  Component, 
  createSignal, 
  Show, 
  createMemo,
  For,
  batch,
} from 'solid-js';
import { Modal, Button, Input, TextArea, Select, TagInput, Badge } from '../ui';
import { 
  LoaderIcon, 
  RefreshIcon, 
  CheckIcon,
  PlusIcon,
} from '../ui/icons';
import { resourceService } from '../../lib/services/resource';
import { FetcherResultData } from '../../lib/fetchers';
import { 
  selectCategoriesArray, 
  selectTopicsArray,
  categoryActions,
  topicActions,
} from '../../lib/stores';
import { getResourceTypeIcon, getResourceTypeName } from '../../lib/detection/detector';
import type { Resource, ResourceType, Category, Topic } from '../../types';
import { generateId } from '../../lib/utils/id';

// Form data type - looser than Resource for editing
interface FormData {
  type?: ResourceType;
  title?: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialMode?: 'auto' | 'manual';
}

type Mode = 'auto' | 'manual';
type Step = 'input' | 'preview' | 'organize';

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: string }[] = [
  { value: 'youtube-video', label: 'YouTube Video', icon: '📺' },
  { value: 'youtube-short', label: 'YouTube Short', icon: '📱' },
  { value: 'youtube-playlist', label: 'YouTube Playlist', icon: '📋' },
  { value: 'youtube-channel', label: 'YouTube Channel', icon: '📡' },
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'research-paper', label: 'Research Paper', icon: '📄' },
  { value: 'article', label: 'Article', icon: '📰' },
  { value: 'webpage', label: 'Webpage', icon: '🌐' },
  { value: 'podcast', label: 'Podcast', icon: '🎙️' },
  { value: 'podcast-episode', label: 'Podcast Episode', icon: '🎧' },
  { value: 'twitter-thread', label: 'Twitter Thread', icon: '🐦' },
  { value: 'github-repo', label: 'GitHub Repository', icon: '💻' },
  { value: 'custom', label: 'Custom', icon: '📦' },
];

export const AddResourceModal: Component<AddResourceModalProps> = (props) => {
  // State
  const [mode, setMode] = createSignal<Mode>(props.initialMode || 'auto');
  const [step, setStep] = createSignal<Step>('input');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Input state
  const [input, setInput] = createSignal(props.initialUrl || '');
  
  // Preview/form state
  const [formData, setFormData] = createSignal<FormData>({});
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>([]);
  const [selectedTopics, setSelectedTopics] = createSignal<string[]>([]);
  const [tags, setTags] = createSignal<string[]>([]);
  
  // New category/topic input
  const [newCategoryName, setNewCategoryName] = createSignal('');
  const [newTopicName, setNewTopicName] = createSignal('');
  const [showNewCategory, setShowNewCategory] = createSignal(false);
  const [showNewTopic, setShowNewTopic] = createSignal(false);

  // Derived state
  const categories = selectCategoriesArray;
  const topics = selectTopicsArray;
  
  const filteredTopics = createMemo(() => {
    if (selectedCategories().length === 0) return topics();
    return topics().filter((t) => 
      t.categoryIds.some((cId) => selectedCategories().includes(cId))
    );
  });

  const categoryOptions = createMemo(() => 
    categories().map((c) => ({
      value: c.id,
      label: c.name,
      color: c.color,
    }))
  );

  const topicOptions = createMemo(() => 
    filteredTopics().map((t) => ({
      value: t.id,
      label: t.name,
      color: t.color,
    }))
  );

  // Reset form when modal closes
  const handleClose = () => {
    batch(() => {
      setMode('auto');
      setStep('input');
      setInput('');
      setFormData({});
      setSelectedCategories([]);
      setSelectedTopics([]);
      setTags([]);
      setError(null);
      setLoading(false);
    });
    props.onClose();
  };

  // Fetch resource preview
  const handleFetch = async () => {
    const value = input().trim();
    if (!value) {
      setError('Please enter a URL, ISBN, DOI, or title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resourceService.preview(value);
      setFormData({
        ...result.preview,
        type: result.type,
      });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resource');
    } finally {
      setLoading(false);
    }
  };

  // Create new category on the fly
  const handleCreateCategory = async () => {
    const name = newCategoryName().trim();
    if (!name) return;

    try {
      const category = await categoryActions.create({
        name,
        order: categories().length,
      });
      setSelectedCategories([...selectedCategories(), category.id]);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  // Create new topic on the fly
  const handleCreateTopic = async () => {
    const name = newTopicName().trim();
    if (!name) return;

    try {
      const topic = await topicActions.create({
        name,
        categoryIds: selectedCategories(),
        order: topics().length,
      });
      setSelectedTopics([...selectedTopics(), topic.id]);
      setNewTopicName('');
      setShowNewTopic(false);
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  };

  // Save resource
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = formData();
      const result = mode() === 'auto'
        ? await resourceService.add(input(), {
            categoryIds: selectedCategories(),
            topicIds: selectedTopics(),
            tags: tags(),
            addedVia: 'manual',
          })
        : await resourceService.addManual({
            ...data,
            categoryIds: selectedCategories(),
            topicIds: selectedTopics(),
            tags: tags(),
          });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add resource');
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={handleClose}
      title="Add Resource"
      size="lg"
    >
      <div class="space-y-6">
        {/* Mode Tabs */}
        <div class="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => { setMode('auto'); setStep('input'); }}
            class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode() === 'auto'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Auto Detect
          </button>
          <button
            onClick={() => { setMode('manual'); setStep('preview'); }}
            class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode() === 'manual'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Manual Input
          </button>
        </div>

        {/* Error Message */}
        <Show when={error()}>
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error()}
          </div>
        </Show>

        {/* Step 1: Input (Auto mode only) */}
        <Show when={mode() === 'auto' && step() === 'input'}>
          <div class="space-y-4">
            <Input
              label="URL, ISBN, DOI, or Title"
              placeholder="https://youtube.com/watch?v=... or 978-0-..."
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              fullWidth
              hint="Paste a URL or enter an ISBN/DOI to auto-detect the resource type"
            />
            
            <div class="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleFetch}
                loading={loading()}
                icon={<RefreshIcon size={18} />}
              >
                Fetch Info
              </Button>
            </div>
          </div>
        </Show>

        {/* Step 2: Preview/Edit */}
        <Show when={step() === 'preview' || mode() === 'manual'}>
          <div class="space-y-4">
            {/* Resource Type */}
            <Select
              label="Resource Type"
              options={RESOURCE_TYPES.map((t) => ({
                value: t.value,
                label: `${t.icon} ${t.label}`,
              }))}
              value={formData().type || 'webpage'}
              onChange={(v) => setFormData({ ...formData(), type: v as ResourceType })}
              fullWidth
            />

            {/* Title */}
            <Input
              label="Title"
              value={formData().title || ''}
              onInput={(e) => setFormData({ ...formData(), title: e.currentTarget.value })}
              fullWidth
              placeholder="Enter resource title"
            />

            {/* URL */}
            <Input
              label="URL"
              value={formData().url || ''}
              onInput={(e) => setFormData({ ...formData(), url: e.currentTarget.value })}
              fullWidth
              placeholder="https://..."
            />

            {/* Description */}
            <TextArea
              label="Description"
              value={formData().description || ''}
              onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
              fullWidth
              placeholder="Optional description"
            />

            {/* Thumbnail Preview */}
            <Show when={formData().thumbnailUrl}>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Thumbnail
                </label>
                <img 
                  src={formData().thumbnailUrl} 
                  alt="Thumbnail preview"
                  class="w-32 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            </Show>

            {/* Categories */}
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categories
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory())}
                  class="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add New
                </button>
              </div>
              
              <Show when={showNewCategory()}>
                <div class="flex gap-2 mb-2">
                  <Input
                    value={newCategoryName()}
                    onInput={(e) => setNewCategoryName(e.currentTarget.value)}
                    placeholder="Category name"
                    fullWidth
                  />
                  <Button onClick={handleCreateCategory} size="sm">
                    Add
                  </Button>
                </div>
              </Show>

              <Select
                options={categoryOptions()}
                value={selectedCategories()}
                onChange={(v) => setSelectedCategories(v as string[])}
                multiple
                searchable
                placeholder="Select categories"
                fullWidth
              />
            </div>

            {/* Topics */}
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Topics
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewTopic(!showNewTopic())}
                  class="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add New
                </button>
              </div>

              <Show when={showNewTopic()}>
                <div class="flex gap-2 mb-2">
                  <Input
                    value={newTopicName()}
                    onInput={(e) => setNewTopicName(e.currentTarget.value)}
                    placeholder="Topic name"
                    fullWidth
                  />
                  <Button onClick={handleCreateTopic} size="sm">
                    Add
                  </Button>
                </div>
              </Show>

              <Select
                options={topicOptions()}
                value={selectedTopics()}
                onChange={(v) => setSelectedTopics(v as string[])}
                multiple
                searchable
                placeholder="Select topics"
                fullWidth
              />
            </div>

            {/* Tags */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <TagInput
                tags={tags()}
                onAdd={(tag) => setTags([...tags(), tag])}
                onRemove={(tag) => setTags(tags().filter((t) => t !== tag))}
                placeholder="Type and press Enter to add tags"
              />
            </div>

            {/* Notes */}
            <TextArea
              label="Notes"
              value={formData().notes || ''}
              onInput={(e) => setFormData({ ...formData(), notes: e.currentTarget.value })}
              fullWidth
              placeholder="Personal notes about this resource"
            />

            {/* Actions */}
            <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Show when={mode() === 'auto' && step() === 'preview'}>
                <Button variant="ghost" onClick={() => setStep('input')}>
                  Back
                </Button>
              </Show>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                loading={loading()}
                icon={<CheckIcon size={18} />}
              >
                Save Resource
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
};

export default AddResourceModal;
