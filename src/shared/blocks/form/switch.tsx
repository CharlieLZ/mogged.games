import * as React from 'react';
import { ControllerRenderProps } from 'react-hook-form';

import { Switch as SwitchComponent } from '@/shared/components/ui/switch';
export function Switch({
  formField,
}: {
  formField: ControllerRenderProps<Record<string, unknown>, string>;
}) {
  return (
    <>
      <SwitchComponent
        checked={Boolean(formField.value)}
        onCheckedChange={formField.onChange}
      />
    </>
  );
}
