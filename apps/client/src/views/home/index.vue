<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import SearchWidget from '@/components/SearchWidget/index.vue';
import RouteCard from '@/components/RouteCard.vue';
import WhyUsCard from '@/components/WhyUsCard.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import RouteCardSkeleton from '@/components/RouteCardSkeleton.vue';
import { useHomeModel } from './model';

const {
  router,
  popularRoutes,
  routesLoading,
  staticRoutes,
  fleetTeaser,
} = useHomeModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
        <!-- Header -->
        <div class="home-header">
          <img src="/assets/logo-t.png" alt="EasyGo" class="home-header__logo" />
        </div>

        <!-- Hero -->
        <div class="home-hero">
          <h1 class="home-hero__title">Поездки между<br/>городами — легко</h1>
          <p class="home-hero__subtitle">
            Бишкек, Алматы, Иссык-Куль и любые индивидуальные маршруты. Свой автопарк.
          </p>
        </div>

        <!-- Search Widget -->
        <SearchWidget />

        <!-- Popular Routes -->
        <SectionHeader title="Популярные маршруты" />
        <div class="home-routes">
          <RouteCardSkeleton v-if="routesLoading" />
          <template v-else-if="popularRoutes.length > 0">
            <RouteCard
              v-for="route in popularRoutes"
              :key="route.id"
              :from-city="route.fromCity"
              :to-city="route.toCity"
              :duration="route.durationLabel ?? undefined"
              :price="route.price"
            />
          </template>
          <template v-else>
            <RouteCard
              v-for="r in staticRoutes"
              :key="r.fromCity + r.toCity"
              :from-city="r.fromCity"
              :to-city="r.toCity"
              :duration="r.duration"
              :price="r.price"
            />
          </template>
        </div>

        <!-- Availability Teaser -->
        <button class="home-avail-teaser" @click="router.push('/tabs/availability')">
          <span class="home-avail-teaser__icon ms-wrap">
            <span class="ms">local_taxi</span>
          </span>
          <div class="home-avail-teaser__content">
            <div class="home-avail-teaser__title">Свободный транспорт сейчас</div>
            <div class="home-avail-teaser__sub">{{ fleetTeaser ?? 'Посмотрите свободные машины онлайн' }}</div>
          </div>
          <span class="ms home-avail-teaser__arrow">chevron_right</span>
        </button>

        <!-- Why EasyGo -->
        <SectionHeader title="Почему EasyGo" />
        <div class="home-why">
          <WhyUsCard
            icon="verified"
            title="Собственный автопарк"
            text="Комфортные автомобили. Видны свободные места онлайн."
          />
          <WhyUsCard
            icon="schedule"
            title="Бронь за минуту"
            text="Выберите рейс и оставьте заявку прямо на сайте."
          />
          <WhyUsCard
            icon="chat"
            title="Связь в WhatsApp"
            text="Привычное общение с оператором в один клик."
          />
        </div>

        <div style="height: 32px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 14px;
}

.home-header__logo {
  height: 26px;
  width: auto;
}

.home-hero {
  padding: 0 18px 4px;
}

.home-hero__title {
  margin: 0;
  font: 800 27px/1.15 'Manrope', sans-serif;
  letter-spacing: -0.02em;
  color: var(--eg-ink);
}

.home-hero__subtitle {
  margin: 8px 0 0;
  font: 500 14px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.home-routes {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-avail-teaser {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 32px);
  margin: 18px 16px 0;
  text-align: left;
  background: var(--eg-ink);
  border: none;
  border-radius: 18px;
  padding: 16px 18px;
  cursor: pointer;
}

.home-avail-teaser__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(86, 169, 25, 0.18);
  color: var(--eg-green-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.ms-wrap {
  font-family: inherit;
}

.home-avail-teaser__content {
  flex: 1;
}

.home-avail-teaser__title {
  font: 700 15px 'Manrope', sans-serif;
  color: #fff;
}

.home-avail-teaser__sub {
  font: 500 12px 'Manrope', sans-serif;
  color: #9CA29A;
  margin-top: 2px;
}

.home-avail-teaser__arrow {
  color: #fff;
  font-size: 22px;
}

.home-why {
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 768px) {
  .home-header {
    padding: 20px 0 16px;
  }

  .home-hero {
    padding: 0 0 8px;
  }

  .home-hero__title {
    font-size: 38px;
    line-height: 1.1;
  }

  .home-routes {
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .home-avail-teaser {
    width: 100%;
    margin: 18px 0 0;
  }

  .home-why {
    padding: 0 0 8px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}
</style>
