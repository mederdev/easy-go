<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const router = useRouter();
const auth = useAuthStore();

const name = ref('');
const phone = ref('');
const newPassword = ref('');
const profileBusy = ref(false);
const profileError = ref<string | null>(null);
const profileSuccess = ref(false);

onMounted(async () => {
  if (!auth.isAuthenticated || auth.isDriver) { router.replace('/tabs/cabinet'); return; }
  if (!auth.client) await auth.fetchMe();
  name.value = auth.client?.name ?? '';
  phone.value = auth.client?.phone ?? '';
});

function initials(n: string): string {
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

async function save(): Promise<void> {
  if (profileBusy.value) return;
  profileBusy.value = true;
  profileError.value = null;
  profileSuccess.value = false;
  try {
    if (name.value.trim()) {
      await api.me.update({ name: name.value.trim() });
      // Refresh profile from server so all components see the updated name
      await auth.fetchMe();
    }
    if (newPassword.value.length >= 6) {
      await api.me.setPassword({ password: newPassword.value });
      newPassword.value = '';
    }
    profileSuccess.value = true;
    setTimeout(() => { profileSuccess.value = false; }, 2000);
  } catch (e) {
    profileError.value = e instanceof ApiError ? e.message : 'Ошибка сохранения';
  } finally {
    profileBusy.value = false;
  }
}
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg pg--narrow">
      <div class="wrap">

        <button class="back" @click="router.back()">
          <span class="ms">arrow_back</span>
        </button>

        <h1 class="title">Профиль</h1>

        <!-- Avatar -->
        <div class="avatar-row">
          <div class="avatar">{{ initials(name) }}</div>
          <div class="avatar-sub">{{ phone }}</div>
        </div>

        <!-- Fields -->
        <div class="section-label">Личные данные</div>

        <div class="field">
          <div class="field-label">Имя</div>
          <input v-model="name" class="input" type="text" autocomplete="name" placeholder="Ваше имя" />
        </div>

        <div class="field">
          <div class="field-label">Номер телефона</div>
          <div class="input input--readonly">
            <span>{{ phone }}</span>
            <span class="ms" style="font-size:18px;color:#c4c8c0">lock</span>
          </div>
        </div>

        <div class="section-label" style="margin-top: 28px">Безопасность</div>

        <div class="field">
          <div class="field-label">Новый пароль <span class="opt">(оставьте пустым, чтобы не менять)</span></div>
          <input
            v-model="newPassword"
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="Минимум 6 символов"
            @keyup.enter="save"
          />
        </div>

        <ErrorBanner v-if="profileError" :message="profileError" style="margin-top: 16px" />
        <div v-if="profileSuccess" class="success-msg">
          <span class="ms" style="font-size:18px">check_circle</span>
          Изменения сохранены!
        </div>

        <button
          class="primary"
          :disabled="profileBusy || !name.trim()"
          @click="save"
        >
          {{ profileBusy ? 'Сохраняем…' : 'Сохранить изменения' }}
        </button>

      </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.wrap { padding: 8px 18px 40px; }
.back {
  width: 38px; height: 38px; border-radius: 11px; border: 1px solid #e7e9e5;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 21px;
}
.title { margin: 22px 0 0; font: 800 26px/1.15 'Manrope', sans-serif; letter-spacing: -0.02em; }

/* Avatar */
.avatar-row { display: flex; flex-direction: column; align-items: center; margin: 24px 0 28px; }
.avatar {
  width: 80px; height: 80px; border-radius: 50%; background: var(--eg-ink); color: var(--eg-green-bright);
  display: flex; align-items: center; justify-content: center; font: 800 30px 'Manrope', sans-serif; margin-bottom: 10px;
}
.avatar-sub { font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted-light); }

/* Section */
.section-label {
  font: 700 11px 'Manrope', sans-serif; color: var(--eg-muted-light);
  text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px;
}

/* Fields */
.field { margin-bottom: 14px; }
.field-label { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-bottom: 6px; }
.opt { color: #c4c8c0; font-weight: 500; }
.input {
  width: 100%; height: 56px; padding: 0 14px; border: 1px solid #e2e5df; border-radius: 14px;
  font: 600 16px 'Manrope', sans-serif; color: var(--eg-ink); outline: none; background: #fff;
  box-sizing: border-box;
}
.input:focus { border-color: var(--eg-green); }
.input--readonly {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8f9f6; color: var(--eg-muted); cursor: default;
}

/* Feedback */
.success-msg {
  margin-top: 14px; padding: 12px 14px; border-radius: 13px; background: var(--eg-green-light);
  color: var(--eg-green-accent); font: 700 13px 'Manrope', sans-serif;
  display: flex; align-items: center; gap: 8px;
}

/* Button */
.primary {
  width: 100%; margin-top: 20px; height: 56px; border: none; border-radius: 15px;
  background: var(--eg-green); color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
