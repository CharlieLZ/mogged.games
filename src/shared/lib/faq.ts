import { FAQ, FAQCategory, FAQItem } from '@/shared/types/blocks/landing';

type FaqSchemaQuestion = {
  question: string;
  answer: string;
};

type FaqSchemaQuestionOptions = {
  groupIndexes?: number[];
  maxItems?: number;
};

function normalizeQuestion(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function normalizeCategoryTitle(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function appendFaqItems(target: FAQItem[], items?: FAQItem[]) {
  if ((items?.length ?? 0) === 0) {
    return target;
  }

  const seenQuestions = new Set(
    target.map((item) => normalizeQuestion(item.question)).filter(Boolean)
  );

  items?.forEach((item) => {
    const questionKey = normalizeQuestion(item.question);
    if (questionKey === '' || seenQuestions.has(questionKey)) {
      return;
    }

    seenQuestions.add(questionKey);
    target.push(item);
  });

  return target;
}

export function getFaqGroups(faq?: FAQ): FAQCategory[] {
  if (faq === undefined) {
    return [];
  }

  const groups: FAQCategory[] = [];

  faq.categories?.forEach((category) => {
    if ((category?.items?.length ?? 0) > 0) {
      groups.push(category);
    }
  });

  if ((faq.items?.length ?? 0) > 0) {
    groups.push({ items: faq.items });
  }

  return groups;
}

export function getFaqItems(faq?: FAQ): FAQItem[] {
  return getFaqGroups(faq).reduce<FAQItem[]>((target, group) => {
    appendFaqItems(target, group.items);
    return target;
  }, []);
}

export function getFaqSchemaQuestions(
  faq?: FAQ,
  options?: FaqSchemaQuestionOptions
): FaqSchemaQuestion[] {
  const groups = getFaqGroups(faq);
  const maxItems = options?.maxItems;

  if (maxItems !== undefined && maxItems <= 0) {
    return [];
  }

  const selectedGroups =
    options?.groupIndexes?.length && options.groupIndexes.length > 0
      ? options.groupIndexes
          .map((index) => groups[index])
          .filter((group): group is FAQCategory => group !== undefined)
      : groups;

  const seenQuestions = new Set<string>();
  const schemaQuestions: FaqSchemaQuestion[] = [];

  selectedGroups.forEach((group) => {
    group.items?.forEach((item) => {
      if (maxItems !== undefined && schemaQuestions.length >= maxItems) {
        return;
      }

      const question = item.question?.trim() ?? '';
      const answer = item.answer?.trim() ?? '';
      const questionKey = normalizeQuestion(question);

      if (
        questionKey === '' ||
        answer === '' ||
        seenQuestions.has(questionKey)
      ) {
        return;
      }

      seenQuestions.add(questionKey);
      schemaQuestions.push({ question, answer });
    });
  });

  return schemaQuestions;
}

export function mergeFaqCategories(
  primary?: FAQCategory[],
  secondary?: FAQCategory[]
): FAQCategory[] | undefined {
  const merged: FAQCategory[] = [];
  const categoryIndexByKey = new Map<string, number>();

  const appendCategory = (category: FAQCategory) => {
    const normalizedItems = appendFaqItems([], category.items);
    if (normalizedItems.length === 0) {
      return;
    }

    const categoryKey = normalizeCategoryTitle(category.title);
    const existingIndex = categoryKey
      ? categoryIndexByKey.get(categoryKey)
      : undefined;

    if (existingIndex !== undefined) {
      const existingCategory = merged[existingIndex];
      existingCategory.items = appendFaqItems(
        existingCategory.items ?? [],
        normalizedItems
      );
      return;
    }

    const nextCategory: FAQCategory = {
      ...category,
      items: normalizedItems,
    };

    merged.push(nextCategory);

    if (categoryKey) {
      categoryIndexByKey.set(categoryKey, merged.length - 1);
    }
  };

  primary?.forEach(appendCategory);
  secondary?.forEach(appendCategory);

  return merged.length > 0 ? merged : undefined;
}
