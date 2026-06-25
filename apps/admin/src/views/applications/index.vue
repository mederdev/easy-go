<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useApplicationsModel } from './model';

const {
  tab,
  loading,
  error,
  drivers,
  partners,
  busyId,
  load,
  setDriver,
  setPartner,
  driverMeta,
  isPending,
  initials,
} = useApplicationsModel();
</script>

<template>
  <div>
    <div class="tabs">
      <button
        type="button"
        class="seg"
        :class="{ active: tab === 'drivers' }"
        @click="tab = 'drivers'"
      >
        Водители · {{ drivers.length }}
      </button>
      <button
        type="button"
        class="seg"
        :class="{ active: tab === 'partners' }"
        @click="tab = 'partners'"
      >
        Партнёры · {{ partners.length }}
      </button>
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <!-- Drivers -->
      <div v-if="tab === 'drivers'" class="list">
        <EmptyState
          v-if="drivers.length === 0"
          icon="badge"
          title="Заявок от водителей нет"
        />
        <div v-for="app in drivers" :key="app.id" class="card">
          <span class="avatar round">{{ initials(app.name) }}</span>
          <div class="info">
            <div class="name-row">
              <span class="name">{{ app.name }}</span>
              <StatusChip kind="application" :status="app.status" />
            </div>
            <div class="meta">{{ driverMeta(app) }}</div>
            <div v-if="app.about" class="about">{{ app.about }}</div>
          </div>
          <div v-if="isPending(app.status)" class="actions">
            <button
              type="button"
              class="accept"
              :disabled="busyId === app.id"
              @click="setDriver(app, 'ACCEPTED')"
            >
              Принять
            </button>
            <button
              type="button"
              class="reject"
              :disabled="busyId === app.id"
              @click="setDriver(app, 'REJECTED')"
            >
              Отклонить
            </button>
          </div>
        </div>
      </div>

      <!-- Partners -->
      <div v-else class="list">
        <EmptyState
          v-if="partners.length === 0"
          icon="handshake"
          title="Заявок от партнёров нет"
        />
        <div v-for="app in partners" :key="app.id" class="card partner">
          <span class="avatar square material-symbols-outlined">storefront</span>
          <div class="info">
            <div class="name-row">
              <span class="name">{{ app.company }}</span>
              <StatusChip kind="application" :status="app.status" />
            </div>
            <div class="meta">
              <template v-if="app.sphere">Сфера: {{ app.sphere }} · </template>контакт: {{ app.contacts }}
            </div>
            <div v-if="app.proposal" class="about">{{ app.proposal }}</div>
          </div>
          <div v-if="isPending(app.status)" class="actions">
            <button
              type="button"
              class="accept"
              :disabled="busyId === app.id"
              @click="setPartner(app, 'ACCEPTED')"
            >
              Принять
            </button>
            <button
              type="button"
              class="reject"
              :disabled="busyId === app.id"
              @click="setPartner(app, 'REJECTED')"
            >
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </StateBlock>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.seg {
  height: 40px;
  padding: 0 18px;
  border-radius: 11px;
  border: none;
  background: #f0f1ee;
  color: var(--eg-muted);
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.seg.active {
  background: var(--eg-ink);
  color: #fff;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.card.partner {
  align-items: flex-start;
}
.avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font: 800 15px var(--eg-font);
}
.avatar.round {
  border-radius: 50%;
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
}
.avatar.square {
  border-radius: 13px;
  background: var(--eg-ink);
  color: var(--eg-brand-bright);
  font-size: 24px;
}
.info {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.name {
  font: 800 15px var(--eg-font);
}
.meta {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.about {
  font: 500 13px var(--eg-font);
  line-height: 1.5;
  color: var(--eg-ink-soft);
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 10px;
  flex: none;
}
.accept {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 11px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.reject {
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--eg-border);
  background: #fff;
  color: var(--eg-muted);
  font: 700 13px var(--eg-font);
  border-radius: 11px;
  cursor: pointer;
}
.accept:disabled,
.reject:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
