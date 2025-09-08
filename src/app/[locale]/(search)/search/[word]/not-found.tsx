import { Button } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { ArrowLeft, Search } from "lucide-react";

export default function WordNotFound() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className="mb-8">
                    <Search className="mx-auto h-16 w-16 text-gray-400" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Kelime Bulunamadı
                </h1>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Aradığınız kelime sözlüğümüzde bulunamadı. Bu kelimeyi önermeniz için katkıda bulunabilirsiniz.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        as={Link}
                        href="/"
                        variant="solid"
                        color="primary"
                        startContent={<ArrowLeft className="h-4 w-4" />}
                    >
                        Ana Sayfaya Dön
                    </Button>

                    <Button
                        as={Link}
                        href="/contribute-word"
                        variant="bordered"
                        color="primary"
                    >
                        Kelime Öner
                    </Button>
                </div>
            </div>
        </div>
    );
}