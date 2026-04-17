export interface OfferGroup {
  id: string;
  searchTitle: string;
  location: string;
  profileId: string;
}

export interface OfferGroupsData {
  offerGroups: OfferGroup[];
}

export interface OfferGroupWithCount extends OfferGroup {
  count: number;
}
