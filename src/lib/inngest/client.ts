import { EventSchemas, Inngest } from "inngest";

type BriefingRequestedEvent = {
  data: {
    tripId: string;
    briefingId: string;
    lat: number;
    lng: number;
    startDate: string;
    endDate: string;
    activity: string;
  };
};

type Events = {
  "briefing/requested": BriefingRequestedEvent;
};

export const inngest = new Inngest({
  id: "backcountry",
  schemas: new EventSchemas().fromRecord<Events>(),
});
