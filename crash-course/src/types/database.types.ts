export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          display_name?: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          role?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          professor_id: string;
          title: string;
          description: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          professor_id: string;
          title: string;
          description?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_professor_id_fkey";
            columns: ["professor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string;
          order: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string;
          order?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          order?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      maps: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          status: string;
          canvas_data: unknown | null;
          map_config: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          status?: string;
          canvas_data?: unknown | null;
          map_config?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          status?: string;
          canvas_data?: unknown | null;
          map_config?: unknown | null;
        };
        Relationships: [
          {
            foreignKeyName: "maps_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          id: string;
          map_id: string;
          title: string;
          order: number;
        };
        Insert: {
          id?: string;
          map_id: string;
          title: string;
          order?: number;
        };
        Update: {
          title?: string;
          order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "maps";
            referencedColumns: ["id"];
          },
        ];
      };
      content_items: {
        Row: {
          id: string;
          chapter_id: string;
          type: string;
          title: string;
          description: string;
          file_url: string | null;
          text_content: string | null;
          quiz_data: unknown | null;
          metadata: unknown | null;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          type: string;
          title: string;
          description?: string;
          file_url?: string | null;
          text_content?: string | null;
          quiz_data?: unknown | null;
          metadata?: unknown | null;
          order?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          file_url?: string | null;
          text_content?: string | null;
          quiz_data?: unknown | null;
          metadata?: unknown | null;
          order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "content_items_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
