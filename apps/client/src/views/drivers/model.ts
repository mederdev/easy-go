import { ref } from 'vue';
import type { CreateDriverApplicationInput } from '@easygo/shared';
import { api } from '@/lib/api';
import { useFormModel } from '@/composables/useFormModel';

/** Driver lead form: validated fields submitted to the applications endpoint. */
export function useDriversModel() {
  const name = ref('');
  const phone = ref('');
  const hasCar = ref(true);
  const carInfo = ref('');
  const experience = ref('');
  const directions = ref('');
  const about = ref('');

  const nameError = ref('');
  const phoneError = ref('');

  const { submitting, submitError, sent, submit: runSubmit } = useFormModel();

  function validate(): boolean {
    nameError.value = '';
    phoneError.value = '';
    let ok = true;
    if (!name.value.trim()) {
      nameError.value = 'Введите имя';
      ok = false;
    }
    if (!phone.value.trim()) {
      phoneError.value = 'Введите телефон';
      ok = false;
    }
    return ok;
  }

  async function submit() {
    if (!validate()) return;
    await runSubmit(async () => {
      const input: CreateDriverApplicationInput = {
        name: name.value.trim(),
        phone: phone.value.trim(),
        hasCar: hasCar.value,
        carInfo: carInfo.value.trim() || undefined,
        experience: experience.value.trim() || undefined,
        directions: directions.value.trim() || undefined,
        about: about.value.trim() || undefined,
      };
      await api.applications.submitDriver(input);
    });
  }

  return {
    name,
    phone,
    hasCar,
    carInfo,
    experience,
    directions,
    about,
    nameError,
    phoneError,
    submitting,
    submitError,
    sent,
    submit,
  };
}
