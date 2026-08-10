import { Href, Link } from "expo-router";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from ".pnpm/expo-web-browser@15.0.11_expo@54.0.36_react-native@0.81.5_@babel+core@7.29.7_@types+react@19.1.17_react@19.1.0_/node_modules/expo-web-browser/src/WebBrowser";
import { type ComponentProps } from ".pnpm/@types+react@19.1.17/node_modules/@types/react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: Href & string;
};

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== "web") {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
