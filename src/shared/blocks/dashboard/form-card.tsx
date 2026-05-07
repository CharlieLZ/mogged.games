import { useMemo, useState } from 'react';

import { Crumb } from '@/shared/blocks/common/crumb';
import { Form } from '@/shared/blocks/form';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import type { Form as FormType } from '@/shared/types/blocks/form';

type FormCardProps = {
  title?: string;
  description?: string;
  crumbs?: NavItem[];
  form: FormType;
  className?: string;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
};

export function FormCard({
  title,
  description,
  crumbs,
  form,
  className,
  defaultCollapsed = false,
  collapsible = false,
}: FormCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const headerContent = useMemo(() => {
    if (!collapsible) return null;
    const label = collapsed ? '展开' : '收起';
    return (
      <Button
        variant="ghost"
        size="sm"
        className="justify-start px-0"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {label}
      </Button>
    );
  }, [collapsed, collapsible]);

  return (
    <Card className={cn('border-border/60', className)}>
      <CardHeader className="space-y-2">
        {crumbs?.length ? <Crumb items={crumbs} /> : null}
        {title ? <CardTitle>{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
        {headerContent}
      </CardHeader>
      {!collapsed ? (
        <CardContent>
          <Form {...form} />
        </CardContent>
      ) : null}
    </Card>
  );
}
