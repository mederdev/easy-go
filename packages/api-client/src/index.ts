import type {
  AdminCreateBookingInput,
  AnalyticsQuery,
  AnalyticsSeries,
  AuthResponse,
  AuthUser,
  AvailableDatesQuery,
  Booking,
  Car,
  Client,
  CreateBookingInput,
  CreateCarInput,
  CreateCustomRequestInput,
  CreateDriverApplicationInput,
  CreateDriverInput,
  CreatePartnerApplicationInput,
  CreateRouteInput,
  CustomRequest,
  DashboardSummary,
  Driver,
  DriverApplication,
  DriverAuthResponse,
  DriverFlightView,
  DriverLoginInput,
  DriverProfile,
  FlightView,
  ListBookingsQuery,
  ListClientsQuery,
  LoginInput,
  ClientAuthResponse,
  ClientLoginInput,
  SetClientPasswordInput,
  MyBookingsQuery,
  OtpRequestInput,
  OtpRequestResponse,
  OtpVerifyInput,
  Paginated,
  PartnerApplication,
  PresignUploadInput,
  PresignUploadResponse,
  Route,
  SearchFlightsQuery,
  SetDriverPasswordInput,
  SetPaymentStatusInput,
  UpdateBookingPaymentInput,
  UpdateDriverInput,
  SystemConfig,
  UpdateBookingStatusInput,
  PaymentStatus,
  UpdateCarInput,
  UpdateMyProfileInput,
  UpdateRouteInput,
  UpdateSystemConfigInput,
} from '@easygo/shared';
import { IDEMPOTENCY_HEADER } from '@easygo/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current JWT (admin app) or null/undefined (public client). */
  getToken?: () => string | null | undefined;
  /** Called on 401 responses (e.g. to clear session + redirect to login). */
  onUnauthorized?: () => void;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function qs(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '');

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    extra?: { query?: Query; idempotencyKey?: string },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = opts.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (extra?.idempotencyKey) headers[IDEMPOTENCY_HEADER] = extra.idempotencyKey;

    const res = await fetch(`${base}${path}${qs(extra?.query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) opts.onUnauthorized?.();

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = data?.error ?? {};
      throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? res.statusText, err.details);
    }
    return data as T;
  }

  return {
    request,

    auth: {
      login: (input: LoginInput) => request<AuthResponse>('POST', '/auth/login', input),
      me: () => request<AuthUser>('GET', '/auth/me'),
    },

    // Customer phone+OTP auth.
    clientAuth: {
      requestOtp: (input: OtpRequestInput) => request<OtpRequestResponse>('POST', '/client-auth/request-otp', input),
      verify: (input: OtpVerifyInput) => request<ClientAuthResponse>('POST', '/client-auth/verify', input),
      login: (input: ClientLoginInput) => request<ClientAuthResponse>('POST', '/client-auth/login', input),
    },

    // Authenticated customer (личный кабинет), scoped to the bearer token.
    me: {
      get: () => request<Client>('GET', '/me'),
      update: (input: UpdateMyProfileInput) => request<Client>('PATCH', '/me', input),
      setPassword: (input: SetClientPasswordInput) => request<Client>('PATCH', '/me/password', input),
      bookings: (query?: MyBookingsQuery) =>
        request<Paginated<Booking>>('GET', '/me/bookings', undefined, { query: query as unknown as Query }),
      booking: (id: string) => request<Booking>('GET', `/me/bookings/${id}`),
      cancelBooking: (id: string) => request<Booking>('PATCH', `/me/bookings/${id}/cancel`),
      customRequests: () =>
        request<{ items: CustomRequest[]; total: number }>('GET', '/me/custom-requests'),
    },

    config: {
      get: () => request<SystemConfig>('GET', '/config'),
      update: (input: UpdateSystemConfigInput) => request<SystemConfig>('PATCH', '/config', input),
    },

    routes: {
      public: () => request<Route[]>('GET', '/routes/public'),
      list: (query?: Query) => request<Route[]>('GET', '/routes', undefined, { query }),
      get: (id: string) => request<Route>('GET', `/routes/${id}`),
      create: (input: CreateRouteInput) => request<Route>('POST', '/routes', input),
      update: (id: string, input: UpdateRouteInput) => request<Route>('PATCH', `/routes/${id}`, input),
      remove: (id: string) => request<Route>('DELETE', `/routes/${id}`),
    },

    flights: {
      search: (query: SearchFlightsQuery) => request<FlightView[]>('GET', '/flights/search', undefined, { query: query as unknown as Query }),
      availableDates: (query: AvailableDatesQuery) => request<string[]>('GET', '/flights/available-dates', undefined, { query: query as unknown as Query }),
      get: (id: string) => request<FlightView>('GET', `/flights/${id}`),
      list: (query?: Query) => request<FlightView[]>('GET', '/flights', undefined, { query }),
      create: (input: unknown) => request<FlightView>('POST', '/flights', input),
      update: (id: string, input: unknown) => request<FlightView>('PATCH', `/flights/${id}`, input),
      setPaymentStatus: (id: string, status: PaymentStatus) =>
        request<FlightView>('PATCH', `/flights/${id}/payment-status`, { status }),
    },

    bookings: {
      /** Public submission. Auto-generates an Idempotency-Key unless supplied. */
      create: (input: CreateBookingInput, idempotencyKey = uuid()) =>
        request<Booking>('POST', '/bookings', input, { idempotencyKey }),
      adminCreate: (input: AdminCreateBookingInput, idempotencyKey = uuid()) =>
        request<Booking>('POST', '/bookings/admin', input, { idempotencyKey }),
      list: (query?: ListBookingsQuery) => request<Paginated<Booking>>('GET', '/bookings', undefined, { query: query as unknown as Query }),
      get: (id: string) => request<Booking>('GET', `/bookings/${id}`),
      setStatus: (id: string, input: UpdateBookingStatusInput) => request<Booking>('PATCH', `/bookings/${id}/status`, input),
      /** Admin-only edit of discount/prepayment amounts. */
      setPayment: (id: string, input: UpdateBookingPaymentInput) => request<Booking>('PATCH', `/bookings/${id}/payment`, input),
      setPaymentStatus: (id: string, input: SetPaymentStatusInput) => request<Booking>('PATCH', `/bookings/${id}/payment-status`, input),
    },

    clients: {
      list: (query?: ListClientsQuery) => request<Paginated<Client>>('GET', '/clients', undefined, { query: query as unknown as Query }),
      get: (id: string) => request<Client>('GET', `/clients/${id}`),
    },

    drivers: {
      list: () => request<Driver[]>('GET', '/drivers'),
      get: (id: string) => request<Driver>('GET', `/drivers/${id}`),
      create: (input: CreateDriverInput) => request<Driver>('POST', '/drivers', input),
      update: (id: string, input: UpdateDriverInput) => request<Driver>('PATCH', `/drivers/${id}`, input),
      setPassword: (id: string, input: SetDriverPasswordInput) => request<null>('POST', `/drivers/${id}/set-password`, input),
      flights: (id: string) => request<FlightView[]>('GET', `/drivers/${id}/flights`),
    },

    driverAuth: {
      login: (input: DriverLoginInput) => request<DriverAuthResponse>('POST', '/driver-auth/login', input),
      me: () => request<DriverProfile>('GET', '/driver-auth/me'),
    },

    driverFlights: {
      list: () => request<DriverFlightView[]>('GET', '/driver-flights'),
      get: (id: string) => request<DriverFlightView>('GET', `/driver-flights/${id}`),
      setStatus: (id: string, status: 'DEPARTED' | 'COMPLETED') =>
        request<DriverFlightView>('PATCH', `/driver-flights/${id}/status`, { status }),
      setFlightPayment: (id: string, status: PaymentStatus) =>
        request<DriverFlightView>('PATCH', `/driver-flights/${id}/payment-status`, { status }),
      setBookingPayment: (flightId: string, bookingId: string, status: PaymentStatus) =>
        request<DriverFlightView>('PATCH', `/driver-flights/${flightId}/bookings/${bookingId}/payment-status`, { status }),
    },

    fleet: {
      available: () => request<Car[]>('GET', '/fleet/available'),
      list: (query?: Query) => request<Car[]>('GET', '/fleet', undefined, { query }),
      create: (input: CreateCarInput) => request<Car>('POST', '/fleet', input),
      update: (id: string, input: UpdateCarInput) => request<Car>('PATCH', `/fleet/${id}`, input),
    },

    applications: {
      submitDriver: (input: CreateDriverApplicationInput, idempotencyKey = uuid()) =>
        request<DriverApplication>('POST', '/applications/drivers', input, { idempotencyKey }),
      submitPartner: (input: CreatePartnerApplicationInput, idempotencyKey = uuid()) =>
        request<PartnerApplication>('POST', '/applications/partners', input, { idempotencyKey }),
      listDrivers: (query?: Query) => request<Paginated<DriverApplication>>('GET', '/applications/drivers', undefined, { query }),
      listPartners: (query?: Query) => request<Paginated<PartnerApplication>>('GET', '/applications/partners', undefined, { query }),
      setDriverStatus: (id: string, status: string) => request<DriverApplication>('PATCH', `/applications/drivers/${id}/status`, { status }),
      setPartnerStatus: (id: string, status: string) => request<PartnerApplication>('PATCH', `/applications/partners/${id}/status`, { status }),
    },

    analytics: {
      dashboard: () => request<DashboardSummary>('GET', '/analytics/dashboard'),
      series: (query: AnalyticsQuery) => request<AnalyticsSeries>('GET', '/analytics/series', undefined, { query: query as unknown as Query }),
    },

    files: {
      presign: (input: PresignUploadInput) => request<PresignUploadResponse>('POST', '/files/presign', input),
    },

    cities: {
      search: (q: string) => request<string[]>('GET', '/cities/search', undefined, { query: { q } }),
    },

    customRequests: {
      create: (input: CreateCustomRequestInput, idempotencyKey = uuid()) =>
        request<CustomRequest>('POST', '/custom-requests', input, { idempotencyKey }),
      list: (query?: Query) =>
        request<Paginated<CustomRequest>>('GET', '/custom-requests', undefined, { query }),
      setStatus: (id: string, status: string) =>
        request<CustomRequest>('PATCH', `/custom-requests/${id}/status`, { status }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
