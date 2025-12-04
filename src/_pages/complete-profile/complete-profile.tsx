"use client"

import { api } from '@/src/trpc/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Session } from 'next-auth';
import { toast } from 'sonner';
import { signOut, useSession } from 'next-auth/react';
import CustomCard from '@/src/components/customs/heroui/custom-card';

const createProfileSchema = (t: (key: string) => string) => z.object({
    username: z.string().min(1, t("username_required")).min(3, t("username_min_length")),
    name: z.string().min(1, t("name_required")).min(2, t("name_min_length")),
});

type CompleteProfileForm = z.infer<ReturnType<typeof createProfileSchema>>;

export default function CompleteProfile({ session }: { session: Session | null }) {
    const { update } = useSession();
    const t = useTranslations("Profile");
    const router = useRouter();
    const completeProfileSchema = createProfileSchema(t);

    const { register, handleSubmit, control } = useForm<CompleteProfileForm>({
        resolver: zodResolver(completeProfileSchema),
        defaultValues: {
            username: session?.user?.username || "",
            name: session?.user?.name || "",
        }
    });

    const updateProfile = api.user.updateProfile.useMutation({
        onSuccess: async () => {
            await update();
            router.push(`/profile/${session?.user?.id}`);
            router.refresh();
        },
        onError: (error) => {
            if (error?.data?.code === "CONFLICT") {
                return toast.error(t("username_taken"))
            }
        }
    });

    const deleteUser = api.user.deleteCurrentUser.useMutation({
        onSuccess: async () => {
            await signOut({ callbackUrl: "/" });
            toast.success(t("account_deleted"));
        }
    });

    const onSubmit = (data: CompleteProfileForm) => {
        updateProfile.mutate(data);
    };

    return (
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
            <CustomCard className="max-w-lg mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">{t("welcome_message")}</h1>
                <p className="mb-6">{t("profile_completion_message")}</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div>
                        <Controller name='username' control={control} render={({ field, fieldState: { error } }) => (
                            <Input
                                {...field}
                                label={t("username")}
                                variant="bordered"
                                isInvalid={!!error}
                                color={error ? "danger" : "default"}
                                errorMessage={error?.message}
                                isRequired
                            />
                        )}
                        />
                    </div>

                    <div>
                        <Controller name='name' control={control} render={({ field, fieldState: { error } }) => (
                            <Input
                                {...field}
                                label={t("name")}
                                variant="bordered"
                                isInvalid={!!error}
                                color={error ? "danger" : "default"}
                                errorMessage={error?.message}
                                isRequired
                            />
                        )} />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-500 transition-colors"
                        disabled={updateProfile.isPending}
                    >
                        {updateProfile.isPending ? t("updating") : t("complete_profile")}
                    </Button>
                    <Button
                        color="danger"
                        variant="light"
                        className="w-full"
                        onPress={() => deleteUser.mutate()}
                        isLoading={deleteUser.isPending}
                    >
                        {t("cancel_signup")}
                    </Button>
                </form>
            </CustomCard>
        </main>
    );
}
