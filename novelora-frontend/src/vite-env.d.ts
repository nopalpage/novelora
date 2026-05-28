/// <reference types="vite/client" />
/// <reference types="react" />

// Support for new React 17+ JSX transform (tsconfig jsx: "react-jsx")
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          name?: string;
          size?: string;
          src?: string;
          icon?: unknown;
          color?: string;
          ios?: string;
          md?: string;
          lazy?: boolean;
          flip?: string;
        },
        HTMLElement
      >;
    }
  }
}
