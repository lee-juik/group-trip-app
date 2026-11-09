export type Category = '맛집' | '카페' | '관광지' | '숙소' | '교통' | '쇼핑';

export const CATEGORIES: Category[] = ['맛집', '카페', '관광지', '숙소', '교통', '쇼핑'];

export interface Member {
  id: string;
  name: string;
}

/** 가고 싶은 곳 카드 */
export interface PlaceCard {
  id: string;
  name: string;
  category: Category;
  summary: string;
  area: string;
  sourceUrl?: string;
  emoji?: string;
  lat?: number;
  lng?: number;
  addedBy: string; // member id
  wantedBy: string[]; // member ids who pressed "가고 싶다"
}

/** 장소를 새로 넣거나 고칠 때 쓰는 입력값 */
export type PlaceInput = Omit<PlaceCard, 'id' | 'addedBy' | 'wantedBy'>;

export type VoteKind = 'single' | 'yesno';

export interface Vote {
  id: string;
  title: string;
  kind: VoteKind;
  optionIds: string[]; // PlaceCard ids
  deadline: string; // ISO
  closed: boolean;
  /** 투표를 마친 멤버 id (누가 뭘 골랐는지는 모른다) */
  voters: string[];
  /** 내가 고른 선택지 */
  myChoice?: string;
  /** 결과가 공개됐을 때만 있음: 선택지 id -> 표 수 */
  counts?: Record<string, number>;
  /** 샘플 모드에서만 쓰는 실제 투표 내역 (서버 모드에서는 서버가 숨겨서 보관) */
  _ballots?: Record<string, string>;
}

export interface Flight {
  flightNo: string;
  from: string;
  to: string;
  depart: string; // HH:mm
  arrive: string; // HH:mm
}

export type TransitMode = '지하철' | '버스' | 'JR' | '도보' | '택시' | '렌트카';

/** 두 일정 사이의 이동 구간 */
export interface TransitLeg {
  mode: TransitMode;
  line?: string;
  depart: string; // HH:mm
  arrive: string; // HH:mm
  fromStop: string;
  toStop: string;
  note?: string;
}

export interface PlanItem {
  id: string;
  time: string; // HH:mm
  placeId?: string;
  title: string;
  /** 예약번호, 주의사항 같은 메모 */
  note?: string;
  /** 이 일정으로 오기 위한 이동 */
  transitIn?: TransitLeg;
}

export interface TripDay {
  id?: string;
  date: string; // YYYY-MM-DD
  outbound?: Flight;
  inbound?: Flight;
  items: PlanItem[];
}

export interface Trip {
  id: string;
  title: string;
  city: string;
  inviteCode?: string;
  /** 방장 멤버 id (내보내기 권한) */
  hostId?: string;
  /** 켜져 있으면 새 멤버가 못 들어온다 (이미 있는 멤버는 같은 이름으로 재입장 가능) */
  joinLocked?: boolean;
  members: Member[];
  places: PlaceCard[];
  votes: Vote[];
  days: TripDay[];
}
