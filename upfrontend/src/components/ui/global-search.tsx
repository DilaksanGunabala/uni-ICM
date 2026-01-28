import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Search,
  Command,
  Users,
  BookOpen,
  Building2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api, { BackendUser, BackendSubject, BackendDepartment } from "@/lib/api";

interface SearchResult {
  id: string;
  type: "user" | "subject" | "department";
  title: string;
  subtitle: string;
  icon: typeof Users;
  href: string;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

export function GlobalSearch({ className, placeholder = "Search users, subjects, departments..." }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      await performSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setIsOpen(true);

    try {
      // Search users, subjects, and departments in parallel
      const [usersResponse, subjectsResponse, departmentsResponse] = await Promise.all([
        api.getUsers({ search: searchQuery, page_size: 5 }).catch(() => ({ items: [] })),
        api.getSubjects({ search: searchQuery, page_size: 5 }).catch(() => ({ items: [] })),
        api.getDepartments({ search: searchQuery, page_size: 5 }).catch(() => ({ items: [] })),
      ]);

      const searchResults: SearchResult[] = [];

      // Map users
      usersResponse.items.forEach((user: BackendUser) => {
        const roleName = user.role_name || user.role || "STUDENT";
        searchResults.push({
          id: `user-${user.id}`,
          type: "user",
          title: `${user.first_name} ${user.last_name}`,
          subtitle: `${roleName.replace("_", " ")} - ${user.email}`,
          icon: Users,
          href: `/users?search=${encodeURIComponent(user.email)}`,
        });
      });

      // Map subjects
      subjectsResponse.items.forEach((subject: BackendSubject) => {
        searchResults.push({
          id: `subject-${subject.id}`,
          type: "subject",
          title: `${subject.code} - ${subject.name}`,
          subtitle: `${subject.department_name || "No Department"} - Semester ${subject.semester}`,
          icon: BookOpen,
          href: `/subjects?search=${encodeURIComponent(subject.code)}`,
        });
      });

      // Map departments
      departmentsResponse.items.forEach((dept: BackendDepartment) => {
        searchResults.push({
          id: `dept-${dept.id}`,
          type: "department",
          title: dept.name,
          subtitle: `Code: ${dept.code}${dept.hod_name ? ` - HOD: ${dept.hod_name}` : ""}`,
          icon: Building2,
          href: `/departments?search=${encodeURIComponent(dept.code)}`,
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    navigate(result.href);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (query.trim()) {
      // If no results selected, navigate to users page with search
      navigate(`/users?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setIsOpen(false);
    }
  };

  const getTypeLabel = (type: "user" | "subject" | "department") => {
    switch (type) {
      case "user":
        return "Users";
      case "subject":
        return "Subjects";
      case "department":
        return "Departments";
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setIsOpen(true)}
            className="pl-10 pr-20 h-11 bg-background"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </div>
      </form>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {getTypeLabel(type as "user" | "subject" | "department")} ({items.length})
                  </div>
                  {items.map((result, idx) => {
                    const globalIndex = results.indexOf(result);
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          globalIndex === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          result.type === "user" && "bg-blue-500/10 text-blue-500",
                          result.type === "subject" && "bg-green-500/10 text-green-500",
                          result.type === "department" && "bg-orange-500/10 text-orange-500"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono">Enter</kbd> to select, <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono">↑↓</kbd> to navigate
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
