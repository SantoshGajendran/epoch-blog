import * as React from "react";
import * as runtime from "react/jsx-runtime";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Figure } from "./figure";
import { DiagramSlot } from "./diagram-slot";
import { InteractiveDiagram } from "./interactive-diagram";

const sharedComponents = {
  Callout,
  pre: CodeBlock,
  Figure,
  DiagramSlot,
  InteractiveDiagram,
};

type MDXComponent = React.ComponentType<{ components?: Record<string, React.ElementType> }>;

const useMDXComponent = (code: string): MDXComponent => {
  return React.useMemo(() => {
    const fn = new Function(code);
    return fn({ ...runtime }).default as MDXComponent;
  }, [code]);
};

interface MDXContentProps {
  code: string;
  components?: Record<string, React.ElementType>;
}

export function MDXContent({ code, components }: MDXContentProps) {
  const Component = useMDXComponent(code);
  return <Component components={{ ...sharedComponents, ...components }} />;
}
