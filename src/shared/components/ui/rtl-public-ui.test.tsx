import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

function primitive(tag = 'div') {
  return ({
    children,
    ...props
  }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) =>
    createElement(tag, props, children);
}

vi.mock('vaul', () => ({
  Drawer: {
    Root: primitive(),
    Trigger: primitive('button'),
    Portal: primitive(),
    Close: primitive('button'),
    Overlay: primitive(),
    Content: primitive(),
    Title: primitive(),
    Description: primitive(),
  },
}));

vi.mock('@radix-ui/react-select', () => ({
  Root: primitive(),
  Group: primitive(),
  Value: primitive('span'),
  Trigger: primitive('button'),
  Content: primitive(),
  Portal: primitive(),
  Viewport: primitive(),
  Label: primitive('label'),
  Item: primitive('div'),
  ItemIndicator: primitive('span'),
  ItemText: primitive('span'),
  Separator: primitive('div'),
  ScrollUpButton: primitive('button'),
  ScrollDownButton: primitive('button'),
  Icon: primitive('span'),
}));

vi.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: primitive(),
  Portal: primitive(),
  Trigger: primitive('button'),
  Content: primitive(),
  Group: primitive(),
  Item: primitive('div'),
  CheckboxItem: primitive('div'),
  ItemIndicator: primitive('span'),
  RadioGroup: primitive(),
  RadioItem: primitive('div'),
  Label: primitive('label'),
  Separator: primitive('div'),
  Sub: primitive(),
  SubTrigger: primitive('div'),
  SubContent: primitive(),
}));

vi.mock('@radix-ui/react-accordion', () => ({
  Root: primitive(),
  Item: primitive(),
  Header: primitive(),
  Trigger: primitive('button'),
  Content: primitive(),
}));

import { Accordion, AccordionItem, AccordionTrigger } from './accordion';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu';
import { SkipLink } from '@/shared/components/ui/skip-link';

import { DialogFooter, DialogHeader } from './dialog';
import { Drawer, DrawerContent, DrawerHeader } from './drawer';
import { PaginationNext, PaginationPrevious } from './pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

describe('public RTL ui primitives', () => {
  it('mirrors skip link placement for rtl locales', () => {
    const markup = renderToStaticMarkup(
      createElement(SkipLink, { href: '#content' }, 'Skip to content')
    );

    expect(markup).toContain('rtl:right-4');
    expect(markup).toContain('rtl:left-auto');
  });

  it('keeps modal headers readable in rtl layouts', () => {
    const dialogMarkup = renderToStaticMarkup(
      createElement(DialogHeader, null, 'Dialog header')
    );
    const dialogFooterMarkup = renderToStaticMarkup(
      createElement(DialogFooter, null, 'Dialog footer')
    );
    const drawerMarkup = renderToStaticMarkup(
      createElement(DrawerHeader, null, 'Drawer header')
    );
    const drawerContentMarkup = renderToStaticMarkup(
      createElement(
        Drawer,
        { open: true },
        createElement(DrawerContent, null, 'Drawer content')
      )
    );

    expect(dialogMarkup).toContain('rtl:sm:text-right');
    expect(dialogFooterMarkup).toContain('rtl:sm:flex-row-reverse');
    expect(drawerMarkup).toContain('rtl:md:text-right');
    expect(drawerContentMarkup).toContain(
      'rtl:data-[vaul-drawer-direction=right]:left-0'
    );
    expect(drawerContentMarkup).toContain(
      'rtl:data-[vaul-drawer-direction=left]:right-0'
    );
  });

  it('mirrors pagination controls and select indicators for rtl layouts', () => {
    const previousMarkup = renderToStaticMarkup(
      createElement(PaginationPrevious, { href: '#' })
    );
    const nextMarkup = renderToStaticMarkup(
      createElement(PaginationNext, { href: '#' })
    );
    const selectItemMarkup = renderToStaticMarkup(
      createElement(
        Select,
        { open: true, value: 'usd' },
        createElement(
          SelectTrigger,
          null,
          createElement(SelectValue, { placeholder: 'Currency' })
        ),
        createElement(
          SelectContent,
          null,
          createElement(SelectItem, { value: 'usd' }, 'USD')
        )
      )
    );

    expect(previousMarkup).toContain('rtl:flex-row-reverse');
    expect(nextMarkup).toContain('rtl:flex-row-reverse');
    expect(selectItemMarkup).toContain('rtl:pr-2');
    expect(selectItemMarkup).toContain('rtl:pl-8');
    expect(selectItemMarkup).toContain('rtl:left-2');
    expect(selectItemMarkup).toContain('rtl:right-auto');
  });

  it('mirrors dropdown menu indicators, submenu arrows, and accordion copy for rtl layouts', () => {
    const checkboxMarkup = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        { open: true },
        createElement(
          DropdownMenuContent,
          null,
          createElement(DropdownMenuCheckboxItem, { checked: true }, 'Arabic')
        )
      )
    );
    const radioMarkup = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        { open: true },
        createElement(
          DropdownMenuContent,
          null,
          createElement(
            DropdownMenuRadioGroup,
            { value: 'ar' },
            createElement(DropdownMenuRadioItem, { value: 'ar' }, 'Arabic')
          )
        )
      )
    );
    const subTriggerMarkup = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        { open: true },
        createElement(
          DropdownMenuContent,
          null,
          createElement(
            DropdownMenuSub,
            { open: true },
            createElement(
              DropdownMenuSubTrigger,
              { inset: true },
              'More locales'
            ),
            createElement(DropdownMenuSubContent, null, 'Submenu')
          )
        )
      )
    );
    const accordionMarkup = renderToStaticMarkup(
      createElement(
        Accordion,
        { type: 'single', collapsible: true },
        createElement(
          AccordionItem,
          { value: 'workflow' },
          createElement(AccordionTrigger, null, 'Workflow lanes')
        )
      )
    );

    expect(checkboxMarkup).toContain('rtl:pr-8');
    expect(checkboxMarkup).toContain('rtl:pl-2');
    expect(checkboxMarkup).toContain('rtl:right-2');
    expect(checkboxMarkup).toContain('rtl:left-auto');
    expect(radioMarkup).toContain('rtl:pr-8');
    expect(radioMarkup).toContain('rtl:pl-2');
    expect(radioMarkup).toContain('rtl:right-2');
    expect(radioMarkup).toContain('rtl:left-auto');
    expect(subTriggerMarkup).toContain('rtl:data-[inset]:pl-2');
    expect(subTriggerMarkup).toContain('rtl:data-[inset]:pr-8');
    expect(subTriggerMarkup).toContain('rtl:ml-0');
    expect(subTriggerMarkup).toContain('rtl:mr-auto');
    expect(subTriggerMarkup).toContain('rtl:rotate-180');
    expect(accordionMarkup).toContain('rtl:text-right');
    expect(accordionMarkup).not.toContain('<h3');
  });
});
