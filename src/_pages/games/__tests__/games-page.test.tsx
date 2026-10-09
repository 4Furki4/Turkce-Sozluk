import { act, waitFor } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server.node";
import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import GamesPage from "../games-page";

jest.mock("framer-motion", () => ({
    ...jest.requireActual("framer-motion"),
    useReducedMotion: jest.fn(),
}));

jest.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

jest.mock("@/src/i18n/routing", () => ({
    Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

describe("GamesPage reduced-motion hydration", () => {
    it("reveals every entrance when the browser requests reduced motion after server rendering", async () => {
        const reducedMotion = jest.mocked(useReducedMotion);
        // The server cannot read the OS setting and emits the hidden entrance states.
        reducedMotion.mockReturnValue(null);
        const container = document.createElement("div");
        container.innerHTML = renderToString(<GamesPage />);
        document.body.appendChild(container);
        const entrances = Array.from(container.querySelectorAll<HTMLElement>('[style*="opacity:0"]'));
        expect(entrances).toHaveLength(10);

        reducedMotion.mockReturnValue(true);
        let root: Root | undefined;
        const consoleError = jest.spyOn(console, "error");
        try {
            await act(async () => {
                root = hydrateRoot(container, <GamesPage />);
            });
            await waitFor(() => {
                for (const entrance of entrances) {
                    expect(entrance).toHaveStyle({ opacity: "1", transform: "none" });
                }
            });
            expect(consoleError).not.toHaveBeenCalled();
        } finally {
            await act(async () => root?.unmount());
            container.remove();
            consoleError.mockRestore();
        }
    });
});
