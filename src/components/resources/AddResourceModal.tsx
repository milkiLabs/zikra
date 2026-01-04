/**
 * Add Resource Modal
 *
 * Modal for adding new resources with auto-detection or manual input.
 * - Auto Detect: Enter URL/ISBN/DOI, fetch metadata, then edit form
 * - Manual Input: Full form immediately available
 * - Switching modes preserves URL if valid
 * - Auto-detection only fills empty fields (never overwrites user input)
 */

import {
  Component,
  createSignal,
  Show,
  createMemo,
  createEffect,
  batch,
} from "solid-js";
import { Modal, Button, Input, TextArea, Select, TagInput } from "../ui";
import { LoaderIcon, RefreshIcon, CheckIcon } from "../ui/icons";
import { resourceService } from "../../lib/services/resource";
import {
  selectCategoriesArray,
  selectTopicsArray,
  categoryActions,
  topicActions,
} from "../../lib/stores";
import type { ResourceType } from "../../types";

interface FormData {
  type: ResourceType;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  notes: string;
  metadata: Record<string, unknown>;
}

export interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  initialUrl?: string;
}

type Mode = "auto" | "manual";

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: string }[] = [
  { value: "youtube-video", label: "YouTube Video", icon: "📺" },
  { value: "youtube-short", label: "YouTube Short", icon: "📱" },
  { value: "youtube-playlist", label: "YouTube Playlist", icon: "📋" },
  { value: "youtube-channel", label: "YouTube Channel", icon: "📡" },
  { value: "book", label: "Book", icon: "📚" },
  { value: "research-paper", label: "Research Paper", icon: "📄" },
  { value: "article", label: "Article", icon: "📰" },
  { value: "webpage", label: "Webpage", icon: "🌐" },
  { value: "podcast", label: "Podcast", icon: "🎙️" },
  { value: "podcast-episode", label: "Podcast Episode", icon: "🎧" },
  { value: "twitter-thread", label: "Twitter Thread", icon: "🐦" },
  { value: "github-repo", label: "GitHub Repository", icon: "💻" },
  { value: "custom", label: "Custom", icon: "📦" },
];

const emptyForm = (): FormData => ({
  type: "webpage",
  title: "",
  description: "",
  url: "",
  thumbnailUrl: "",
  notes: "",
  metadata: {},
});

const isValidUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export const AddResourceModal: Component<AddResourceModalProps> = (props) => {
  // Core state
  const [mode, setMode] = createSignal<Mode>("auto");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Auto-detect state
  const [autoInput, setAutoInput] = createSignal("");
  const [hasFetched, setHasFetched] = createSignal(false);

  // Form state (shared between modes after fetch, or used directly in manual)
  const [formData, setFormData] = createSignal<FormData>(emptyForm());
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>(
    [],
  );
  const [selectedTopics, setSelectedTopics] = createSignal<string[]>([]);
  const [tags, setTags] = createSignal<string[]>([]);

  // Track which fields user has touched (to prevent overwriting)
  const [touchedFields, setTouchedFields] = createSignal<Set<string>>(
    new Set(),
  );

  // New category/topic input
  const [newCategoryName, setNewCategoryName] = createSignal("");
  const [newTopicName, setNewTopicName] = createSignal("");
  const [showNewCategory, setShowNewCategory] = createSignal(false);
  const [showNewTopic, setShowNewTopic] = createSignal(false);

  // Derived state
  const categories = selectCategoriesArray;
  const topics = selectTopicsArray;

  const filteredTopics = createMemo(() => {
    if (selectedCategories().length === 0) return topics();
    return topics().filter((t) =>
      t.categoryIds.some((cId) => selectedCategories().includes(cId)),
    );
  });

  const categoryOptions = createMemo(() =>
    categories().map((c) => ({ value: c.id, label: c.name, color: c.color })),
  );

  const topicOptions = createMemo(() =>
    filteredTopics().map((t) => ({
      value: t.id,
      label: t.name,
      color: t.color,
    })),
  );

  // Show form in auto mode only after fetching
  const showForm = createMemo(() => mode() === "manual" || hasFetched());

  // Auto-fetch when modal opens with initialUrl
  createEffect(() => {
    if (props.open && props.initialUrl && !hasFetched() && !loading()) {
      setAutoInput(props.initialUrl);
      handleFetch();
    }
  });

  // Reset everything when modal closes
  const resetState = () => {
    batch(() => {
      setMode("auto");
      setAutoInput("");
      setHasFetched(false);
      setFormData(emptyForm());
      setSelectedCategories([]);
      setSelectedTopics([]);
      setTags([]);
      setTouchedFields(new Set());
      setError(null);
      setLoading(false);
      setNewCategoryName("");
      setNewTopicName("");
      setShowNewCategory(false);
      setShowNewTopic(false);
    });
  };

  const handleClose = () => {
    resetState();
    props.onClose();
  };

  // Switch modes
  const switchToManual = () => {
    const input = autoInput().trim();

    // If input is a valid URL, pre-fill the URL field only
    if (input && isValidUrl(input) && !formData().url) {
      setFormData((prev) => ({ ...prev, url: input }));
    }

    setMode("manual");
  };

  const switchToAuto = () => {
    // If we have a URL in form, put it back in auto input
    const url = formData().url;
    if (url && isValidUrl(url) && !autoInput()) {
      setAutoInput(url);
    }

    setHasFetched(false);
    setMode("auto");
  };

  // Mark field as touched when user edits it
  const markTouched = (field: string) => {
    setTouchedFields((prev) => new Set([...prev, field]));
  };

  // Update form field with touch tracking
  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    markTouched(field);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch resource preview
  const handleFetch = async () => {
    const value = autoInput().trim();
    if (!value) {
      setError("Please enter a URL, ISBN, DOI, or title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resourceService.preview(value);
      const preview = result.preview as Partial<FormData>;

      // Only fill fields that user hasn't touched
      const touched = touchedFields();
      const current = formData();

      const newData: FormData = {
        type: touched.has("type")
          ? current.type
          : preview.type || result.type || current.type,
        title: touched.has("title")
          ? current.title
          : preview.title || current.title,
        description: touched.has("description")
          ? current.description
          : preview.description || current.description,
        url: touched.has("url")
          ? current.url
          : preview.url || value || current.url,
        thumbnailUrl: touched.has("thumbnailUrl")
          ? current.thumbnailUrl
          : preview.thumbnailUrl || current.thumbnailUrl,
        notes: current.notes, // Always preserve notes
        metadata: preview.metadata || current.metadata,
      };

      setFormData(newData);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch resource");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch (user clicked refresh)
  const handleRefetch = async () => {
    const url = formData().url || autoInput();
    if (!url) return;

    setAutoInput(url);
    await handleFetch();
  };

  // Create new category
  const handleCreateCategory = async () => {
    const name = newCategoryName().trim();
    if (!name) return;

    try {
      const category = await categoryActions.create({
        name,
        order: categories().length,
      });
      setSelectedCategories([...selectedCategories(), category.id]);
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (err) {
      console.error("Failed to create category:", err);
    }
  };

  // Create new topic
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
      setNewTopicName("");
      setShowNewTopic(false);
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  };

  // Save resource
  const handleSave = async () => {
    const data = formData();

    if (!data.title && !data.url) {
      setError("Please provide at least a title or URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resourceService.addManual({
        ...data,
        categoryIds: selectedCategories(),
        topicIds: selectedTopics(),
        tags: tags(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to add resource");
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save resource");
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
      <div class="space-y-5">
        {/* Mode Tabs */}
        <div class="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={switchToAuto}
            class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode() === "auto"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Auto Detect
          </button>
          <button
            onClick={switchToManual}
            class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode() === "manual"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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

        {/* Auto Detect Input */}
        <Show when={mode() === "auto" && !hasFetched()}>
          <div class="space-y-4">
            <Input
              label="URL, ISBN, DOI, or Title"
              placeholder="https://youtube.com/watch?v=... or 978-0-..."
              value={autoInput()}
              onInput={(e) => setAutoInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
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
                disabled={!autoInput().trim()}
                icon={<RefreshIcon size={18} />}
              >
                Fetch Info
              </Button>
            </div>
          </div>
        </Show>

        {/* Resource Form */}
        <Show when={showForm()}>
          <div class="space-y-4">
            {/* Resource Type */}
            <Select
              label="Resource Type"
              options={RESOURCE_TYPES.map((t) => ({
                value: t.value,
                label: `${t.icon} ${t.label}`,
              }))}
              value={formData().type}
              onChange={(v) => updateField("type", v as ResourceType)}
              fullWidth
            />

            {/* Title */}
            <Input
              label="Title"
              value={formData().title}
              onInput={(e) => updateField("title", e.currentTarget.value)}
              fullWidth
              placeholder="Enter resource title"
            />

            {/* URL */}
            <Input
              label="URL"
              value={formData().url}
              onInput={(e) => updateField("url", e.currentTarget.value)}
              fullWidth
              placeholder="https://..."
            />

            {/* Description */}
            <TextArea
              label="Description"
              value={formData().description}
              onInput={(e) => updateField("description", e.currentTarget.value)}
              fullWidth
              placeholder="Optional description"
              rows={3}
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCreateCategory()
                    }
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
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTopic()}
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
              value={formData().notes}
              onInput={(e) => updateField("notes", e.currentTarget.value)}
              fullWidth
              placeholder="Personal notes about this resource"
              rows={3}
            />

            {/* Actions */}
            <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Show when={mode() === "auto" && hasFetched()}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHasFetched(false);
                    setError(null);
                  }}
                >
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
