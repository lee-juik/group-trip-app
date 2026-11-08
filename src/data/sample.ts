import { Trip } from '../types';

// 데모용 샘플 여행. 시간표는 실제 운행 시간이 아니라 예시 값이다.
export const sampleTrip: Trip = {
  id: 'trip-sapporo',
  title: '삿포로 겨울 여행',
  city: '삿포로',
  members: [
    { id: 'm1', name: '주익' },
    { id: 'm2', name: '민지' },
    { id: 'm3', name: '현우' },
    { id: 'm4', name: '서연' },
  ],
  places: [
    { id: 'p1', lat: 43.0583, lng: 141.354, emoji: '🍛', name: '스프카레 가라쿠', category: '맛집', area: '스스키노', summary: '삿포로 대표 수프카레. 웨이팅 30분 이상, 오픈 직후 추천.', sourceUrl: 'https://instagram.com/p/example1', addedBy: 'm2', wantedBy: ['m1', 'm2', 'm4'] },
    { id: 'p2', lat: 43.0553, lng: 141.353, emoji: '🍖', name: '징기스칸 다루마', category: '맛집', area: '스스키노', summary: '양고기 숯불구이. 좌석 적음, 저녁 늦게 가면 대기 짧음.', addedBy: 'm1', wantedBy: ['m1', 'm3'] },
    { id: 'p3', lat: 43.0587, lng: 141.3577, emoji: '🦀', name: '니조시장 해산물 덮밥', category: '맛집', area: '오도리', summary: '아침 일찍 가는 카이센동. 7시부터 영업.', addedBy: 'm4', wantedBy: ['m4'] },
    { id: 'p4', lat: 43.199, lng: 141.0021, emoji: '🏮', name: '오타루 운하', category: '관광지', area: '오타루', summary: 'JR로 40분. 해 질 녘 가스등 켜질 때가 예쁨.', addedBy: 'm3', wantedBy: ['m1', 'm2', 'm3', 'm4'] },
    { id: 'p5', lat: 43.0389, lng: 141.3221, emoji: '🌃', name: '모이와야마 전망대', category: '관광지', area: '모이와', summary: '로프웨이 + 미니 케이블카. 야경 명소.', addedBy: 'm2', wantedBy: ['m2', 'm4'] },
    { id: 'p6', lat: 43.066, lng: 141.351, emoji: '🧈', name: '롯카테이 본점 카페', category: '카페', area: '삿포로역', summary: '버터샌드 본점, 2층 카페 한정 디저트.', addedBy: 'm4', wantedBy: ['m4', 'm2'] },
    { id: 'h1', lat: 43.0547, lng: 141.3555, emoji: '♨️', name: '스스키노 호텔 A', category: '숙소', area: '스스키노', summary: '1박 1인 6만원대, 대욕장 있음, 역 도보 2분.', addedBy: 'm1', wantedBy: [] },
    { id: 'h2', lat: 43.0686, lng: 141.3507, emoji: '🚉', name: '삿포로역 호텔 B', category: '숙소', area: '삿포로역', summary: '1박 1인 8만원대, JR역 직결이라 오타루 이동 편함.', addedBy: 'm3', wantedBy: [] },
    { id: 'h3', lat: 43.0601, lng: 141.354, emoji: '🏙', name: '오도리 호텔 C', category: '숙소', area: '오도리', summary: '1박 1인 5만원대, 신축, 방이 좁음.', addedBy: 'm2', wantedBy: [] },
  ],
  votes: [
    { id: 'v1', title: '숙소 예약할 시간입니다! 어디로 할까요?', kind: 'single', optionIds: ['h1', 'h2', 'h3'], deadline: '2026-11-10T21:00:00+09:00', _ballots: { m2: 'h2', m3: 'h2' }, voters: [], closed: false },
  ],
  days: [
    {
      date: '2026-12-20',
      outbound: { flightNo: 'KE765', from: '인천', to: '신치토세', depart: '09:00', arrive: '12:10' },
      items: [
        { id: 'i1', time: '12:10', title: '신치토세 공항 도착' },
        { id: 'i2', time: '13:40', title: '호텔 체크인 / 짐 맡기기', transitIn: { mode: 'JR', line: '쾌속 에어포트', depart: '13:00', arrive: '13:37', fromStop: '신치토세공항역', toStop: '삿포로역', note: '15분 간격 운행' } },
        { id: 'i3', time: '14:30', title: '스프카레 가라쿠', placeId: 'p1', transitIn: { mode: '지하철', line: '난보쿠선', depart: '14:10', arrive: '14:14', fromStop: '삿포로역', toStop: '스스키노역' } },
        { id: 'i4', time: '18:00', title: '모이와야마 전망대 야경', placeId: 'p5', transitIn: { mode: '버스', line: '노면전차 → 셔틀버스', depart: '17:15', arrive: '17:45', fromStop: '스스키노', toStop: '로프웨이 입구' } },
      ],
    },
    {
      date: '2026-12-21',
      items: [
        { id: 'i5', time: '09:00', title: '니조시장 해산물 덮밥', placeId: 'p3' },
        { id: 'i6', time: '11:30', title: '오타루 운하', placeId: 'p4', transitIn: { mode: 'JR', line: '하코다테본선 쾌속', depart: '10:40', arrive: '11:20', fromStop: '삿포로역', toStop: '오타루역' } },
      ],
    },
    {
      date: '2026-12-22',
      inbound: { flightNo: 'KE766', from: '신치토세', to: '인천', depart: '13:30', arrive: '16:50' },
      items: [
        { id: 'i7', time: '09:30', title: '롯카테이 본점 카페', placeId: 'p6' },
      ],
    },
  ],
};
