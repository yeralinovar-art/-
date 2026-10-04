"use client";

import { useActionState, useState } from "react";
import { Card, FormMessage, SubmitButton, TextField } from "@/components/ui";
import { updateProfile, type ProfileState } from "./actions";

const AVATARS = ["🙂", "😊", "🌸", "🌿", "🦋", "🐻", "🦊", "🐱", "☀️", "🌙", "⭐", "🍀"];

export function ProfileForm({
  displayName,
  avatarEmoji,
  familyName,
}: {
  displayName: string;
  avatarEmoji: string;
  familyName: string;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [avatar, setAvatar] = useState(avatarEmoji);

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <TextField label="Имя" name="display_name" defaultValue={displayName} maxLength={40} required />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-muted">Аватар</legend>
          <input type="hidden" name="avatar_emoji" value={avatar} />
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                aria-pressed={avatar === emoji}
                aria-label={`Аватар ${emoji}`}
                className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${
                  avatar === emoji ? "bg-accent-soft ring-2 ring-accent" : "bg-card-muted"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </fieldset>

        <TextField label="Название семьи" name="family_name" defaultValue={familyName} maxLength={60} />

        <FormMessage message={state.message} />
        <SubmitButton>Сохранить</SubmitButton>
      </form>
    </Card>
  );
}
