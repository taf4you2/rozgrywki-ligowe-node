export type ClubInput = {
    name: string;
    city: string;
};

export type Club = {
    id: number;
    name: string;
    city: string;

    createdAt: string;
    updatedAt: string;
};

export type ClubPlayer = {
    id: number;
    clubId: number;
    firstName: string;
    lastName: string;
};
