import { notFound } from "next/navigation";

export const instant = false;

export default function MissingRoute() {
    notFound();
}
