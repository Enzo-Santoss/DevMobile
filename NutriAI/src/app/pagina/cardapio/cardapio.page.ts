import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonMenuButton, IonSegment, IonSegmentButton, IonIcon, IonList, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonItem, IonThumbnail, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barbell, basket, call, globe, heart, home, man, person, pin, star, trash } from 'ionicons/icons';
import { SheetsService, MenuItem } from '../../services/sheets.service';
import { ProfileSyncService } from '../../services/profile-sync.service';
import { ToastController } from '@ionic/angular';


@Component({
  selector: 'app-cardapio',
  templateUrl: './cardapio.page.html',
  styleUrls: ['./cardapio.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, IonSegment, IonSegmentButton, IonIcon, IonList, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonItem, IonThumbnail, IonSpinner]
})
export class CardapioPage implements OnInit {
  private readonly sheets = inject(SheetsService);
  private readonly route = inject(ActivatedRoute);
  private readonly profileSync = inject(ProfileSyncService);
  private readonly toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ man, barbell, heart, star });
  }

  // Create a slug/id from a title string (lowercase, alphanumerics and dashes)
  private slugify(text?: string): string {
    const t = (text || '').toString().trim().toLowerCase();
    return t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `item-${Math.random().toString(36).slice(2,8)}`;
  }

  escolhar = 'ganhar';

  // data loaded from Google Sheets
  categories: string[] = [];
  menuByCategory: Record<string, MenuItem[]> = {};
  // master list of items as loaded from SheetsService
  allItems: MenuItem[] = [];
  loading = true;
  favorites: MenuItem[] = [];
  // local favorites persisted by item id
  localFavorites = new Set<string>();
  // id requested via query params to open on load
  private openItemId?: string | undefined;
  private openItemTitle?: string | undefined;
  // expanded items to show recipe details
  expanded = new Set<string>();

  alterar(evento: any) {
    this.escolhar = evento.detail.value;
  }

  ngOnInit() {
    addIcons({ barbell, basket, call, globe, heart, home, person, pin, star, trash, man });
    this.loadMenu();
    this.loadLocalFavorites();
    // capture possible query param to open a specific recipe after load
    const q = this.route.snapshot.queryParamMap.get('id');
    const t = this.route.snapshot.queryParamMap.get('title');
    if (q) this.openItemId = q;
    if (t) this.openItemTitle = t;
  }

  private loadLocalFavorites() {
    try {
      const raw = localStorage.getItem('localFavorites');
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        this.localFavorites = new Set(arr);
      }
    } catch (e) {
      console.warn('Failed to load localFavorites', e);
      this.localFavorites = new Set();
    }
  }

  private saveLocalFavorites() {
    try {
      localStorage.setItem('localFavorites', JSON.stringify(Array.from(this.localFavorites)));
    } catch (e) {
      console.warn('Failed to save localFavorites', e);
    }
  }

  private loadMenu() {
    this.loading = true;
    // You can pass a custom range, otherwise uses default from environment
    this.sheets.getMenuItems().subscribe({
      next: items => {
        // keep master list to avoid duplications when rebuilding favorites
        this.allItems = items.slice();
        // Ensure every item has a stable id (slugified title) so local favorites can be tracked
        this.allItems.forEach(i => {
          if (!i.id || i.id.toString().trim() === '') {
            i.id = this.slugify(i.title || (i.meal || 'item'));
          }
        });
        // group by category (use this.allItems which has ensured ids)
        this.menuByCategory = {};
        this.allItems.forEach(i => {
          const cat = (i.category || 'other').toLowerCase();
          if (!this.menuByCategory[cat]) this.menuByCategory[cat] = [];
          this.menuByCategory[cat].push(i);
        });
        this.categories = Object.keys(this.menuByCategory);

        // build favorites list (items with favorite === true OR local favorite)
        this.favorites = this.allItems.filter(i => !!i.favorite || (i.id && this.localFavorites.has(i.id)));

        // Ensure a 'favoritos' category exists and is shown as the first segment
        if (!this.menuByCategory['favoritos']) this.menuByCategory['favoritos'] = [];
        // replace favorites array in menuByCategory['favoritos']
        this.menuByCategory['favoritos'] = this.favorites.slice();
        // Ensure 'favoritos' is first in categories
        if (!this.categories.includes('favoritos')) this.categories.unshift('favoritos');

        // default selection: always prefer 'favoritos' if available, otherwise fall back to 'ganhar' or first
        if (this.categories.includes('favoritos')) {
          this.escolhar = 'favoritos';
        } else if (this.categories.includes('ganhar')) {
          this.escolhar = 'ganhar';
        } else if (this.categories.length && !this.escolhar) {
          this.escolhar = this.categories[0];
        }
        // If a specific id was requested via query params, open it
        // If an id was requested, prefer matching by id. Otherwise try title match (case-insensitive).
        if (this.openItemId || this.openItemTitle) {
          let found: MenuItem | undefined;
          if (this.openItemId) found = this.allItems.find(x => x.id === this.openItemId);
          if (!found && this.openItemTitle) {
            const titleLookup = (this.openItemTitle || '').toString().trim().toLowerCase();
            found = this.allItems.find(x => (x.title || '').toString().trim().toLowerCase() === titleLookup);
          }
          if (found) {
            const cat = (found.category || 'outro').toLowerCase();
            if (this.menuByCategory[cat]) this.escolhar = cat;
            this.expanded.add(found.id ?? found.title ?? JSON.stringify(found));
          }
          this.openItemId = undefined;
          this.openItemTitle = undefined;
        }
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load menu from Sheets', err);
        this.loading = false;
      }
    });
  }

  // Returns true if an item is favorited either by sheet or locally
  isFavorited(item: MenuItem) {
    if (!item) return false;
    if (item.favorite) return true; // sheet favorite
    if (item.id && this.localFavorites.has(item.id)) return true;
    return false;
  }

  async toggleLocalFavorite(item: MenuItem) {
    if (!item || !item.id) return;
    let added = false;
    if (this.localFavorites.has(item.id)) {
      this.localFavorites.delete(item.id);
      added = false;
    } else {
      this.localFavorites.add(item.id);
      added = true;
    }
    this.saveLocalFavorites();
    // rebuild favorites category
    this.favorites = this.allItems.filter((i: MenuItem) => !!i.favorite || (i.id && this.localFavorites.has(i.id)));
    this.menuByCategory['favoritos'] = this.favorites.slice();
    // notify profile sync service to persist local changes (supports offline)
    try { this.profileSync.syncLocalStorageToServer(); } catch(e) { console.warn('ProfileSync notify failed', e); }

    // Só mostra toast se salvou localmente (não apenas sync cloud)
    if (!navigator.onLine) {
      try {
        const title = item.title || 'receita';
        const msg = added ? `Favorito adicionado: ${title}` : `Favorito removido: ${title}`;
        const color = added ? 'success' : 'medium';
        const t = await this.toastCtrl.create({ message: msg, duration: 1800, color });
        await t.present();
      } catch (e) {
        console.warn('Failed to present favorite toast', e);
      }
    }
  }

  // true only for local favorites (used to color the star)
  isLocalFavorited(item: MenuItem) {
    if (!item) return false;
    if (!item.id) return false;
    return this.localFavorites.has(item.id);
  }

  // IDs of items currently animating the star -> yellow glow before switching to tag
  animatingFavorites = new Set<string>();

  // Called when user taps the star to favorite an item. We animate then let the normal
  // favorite state (saved to localFavorites) show the tag.
  handleStarClick(item: MenuItem) {
    if (!item || !item.id) return;
    const id = item.id;
    // mark as animating so star stays visible and glows
    this.animatingFavorites.add(id);
    // toggle favorite (will add to localFavorites)
    this.toggleLocalFavorite(item);
    // after animation, remove from animating set so star disappears and tag appears
    setTimeout(() => {
      this.animatingFavorites.delete(id);
    }, 600);
  }

  // Helper to split the composed description into its parts: ingredientes, receita, macros
  getParts(item: MenuItem) {
    const empty = { ingredientes: '', receita: '', macros: '' };
    if (!item) return empty;
    // Prefer explicit fields populated by SheetsService
    if (item.ingredientes || item.receita || item.macros) {
      return {
        ingredientes: item.ingredientes ?? '',
        receita: item.receita ?? '',
        macros: item.macros ?? ''
      };
    }
    if (!item.description) return empty;
    // Fallback: split on double newlines, but also accept single-newline groups
    let parts = item.description.split('\n\n').map(p => p.trim()).filter(Boolean);
    if (parts.length === 1) {
      // Maybe the source used single newlines — try to heuristically split by header words
      const text = parts[0];
      const match = text.split(/\bReceita\b/i);
      if (match.length > 1) {
        const ing = match[0].trim();
        const rest = match.slice(1).join('Receita').trim();
        const macrosMatch = rest.split(/\bMacros\b/i);
        return {
          ingredientes: ing,
          receita: macrosMatch[0].trim(),
          macros: (macrosMatch[1] || '').trim()
        };
      }
      // As a last resort, split by single newline into two roughly equal halves
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const mid = Math.ceil(lines.length / 2);
      return {
        ingredientes: lines.slice(0, mid).join('\n'),
        receita: lines.slice(mid).join('\n'),
        macros: ''
      };
    }
    return {
      ingredientes: parts[0] ?? '',
      receita: parts[1] ?? '',
      macros: parts.slice(2).join('\n\n') ?? ''
    };
  }

  toggleExpanded(item: MenuItem) {
    if (!item) return;
    const key = item.id ?? item.title ?? JSON.stringify(item);
    if (this.expanded.has(key)) this.expanded.delete(key);
    else this.expanded.add(key);
  }

  isExpanded(item: MenuItem) {
    if (!item) return false;
    const key = item.id ?? item.title ?? JSON.stringify(item);
    return this.expanded.has(key);
  }

  macroSummary(item: MenuItem) {
    const parts = this.getParts(item);
    const m = parts.macros || '';
    if (!m) return '';
    const firstLine = (m.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0]) ?? m;
    return firstLine;
  }
}
