from flask import Flask
from flask import render_template, redirect, url_for, make_response, request

from game_infos import game_infos, game_infos_with_cover
import json

number_to_show_on_index = 42

app = Flask(__name__)

SAVES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saves')
os.makedirs(SAVES_DIR, exist_ok=True)
FAVORITES_FILE = os.path.join(SAVES_DIR, 'favorites.json')


def load_favorites():
    if os.path.exists(FAVORITES_FILE):
        try:
            with open(FAVORITES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            app.logger.warning(f"Error loading favorites: {e}")
    return []


def save_favorites(fav_list):
    try:
        with open(FAVORITES_FILE, 'w', encoding='utf-8') as f:
            json.dump(fav_list, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        app.logger.error(f"Error saving favorites: {e}")
        return False



@app.route('/')
def index():
    game_infos_to_show = game_infos_with_cover[:number_to_show_on_index - 1]
    return render_template('index-imgs.html', game_infos=game_infos_to_show, game_count=len(game_infos['games']))


@app.route('/about')
def about():
    return render_template('about.html', games=game_infos['games'])


@app.route('/games/')
def games():
    return render_template('games.html', games=game_infos['games'])


@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q')
    if query is None:
        return render_template('error.html'), 404
    search_games = dict()
    for identifier, value in game_infos['games'].items():
        if query in value['name']['zh-Hans']:
            search_games[identifier] = value
    return render_template('search.html', games=search_games, query=query)



@app.route('/favorites')
@app.route('/favorites/')
def favorites():
    fav_ids = set(load_favorites())
    fav_games = {k: v for k, v in game_infos['games'].items() if k in fav_ids}
    return render_template('favorites.html', games=fav_games, favorite_count=len(fav_games))


@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    favs = load_favorites()
    return jsonify({'success': True, 'favorites': favs})


@app.route('/api/favorites/toggle', methods=['POST'])
def toggle_favorite():
    data = request.get_json(silent=True) or {}
    identifier = data.get('identifier')
    if not identifier or identifier not in game_infos['games']:
        return jsonify({'success': False, 'error': 'Invalid game identifier'}), 400
    
    favs = load_favorites()
    if identifier in favs:
        favs.remove(identifier)
        is_fav = False
    else:
        favs.append(identifier)
        is_fav = True
        
    save_favorites(favs)
    return jsonify({
        'success': True,
        'identifier': identifier,
        'is_favorite': is_fav,
        'favorites': favs,
        'count': len(favs)
    })


@app.route('/games/<identifier>/')
def game(identifier):
    game_info = game_infos["games"][identifier]
    return render_template('game.html', game_info=game_info)


@app.route('/games/<identifier>/logo/emularity_color_small.png')
def emularity_logo(identifier):
    return redirect(url_for('static', filename='emularity/emularity_color_small.png'), code=301)


if __name__ == '__main__':
    app.run(debug=True)
