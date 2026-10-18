from flask import Flask
from flask import render_template, redirect, url_for, make_response, request

from game_infos import game_infos, game_infos_with_cover
import json

number_to_show_on_index = 42

app = Flask(__name__)

SAVES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saves')
os.makedirs(SAVES_DIR, exist_ok=True)


@app.route('/api/saves/<path:identifier>', methods=['GET'])
def get_saves(identifier):
    clean_id = os.path.basename(identifier)
    game_save_dir = os.path.join(SAVES_DIR, clean_id)
    if not os.path.exists(game_save_dir):
        return jsonify({'success': True, 'exists': False, 'files': {}})
    
    files_data = {}
    for root, dirs, files in os.walk(game_save_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, game_save_dir).replace('\\', '/')
            if not rel_path.startswith('/'):
                rel_path = '/' + rel_path
            try:
                with open(full_path, 'rb') as f:
                    files_data[rel_path] = base64.b64encode(f.read()).decode('utf-8')
            except Exception as e:
                app.logger.warning(f"Error reading save file {full_path}: {e}")
                
    mtime = os.path.getmtime(game_save_dir) if os.path.exists(game_save_dir) else time.time()
    return jsonify({
        'success': True,
        'exists': len(files_data) > 0,
        'timestamp': mtime,
        'files': files_data
    })


@app.route('/api/saves/<path:identifier>', methods=['POST'])
def post_saves(identifier):
    clean_id = os.path.basename(identifier)
    game_save_dir = os.path.join(SAVES_DIR, clean_id)
    os.makedirs(game_save_dir, exist_ok=True)
    
    data = request.get_json(silent=True) or {}
    files = data.get('files', {})
    saved_count = 0
    
    for rel_path, b64_content in files.items():
        clean_rel = os.path.normpath(rel_path.lstrip('/')).replace('..', '')
        if not clean_rel:
            continue
        dest_path = os.path.join(game_save_dir, clean_rel)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        try:
            raw_bytes = base64.b64decode(b64_content)
            with open(dest_path, 'wb') as f:
                f.write(raw_bytes)
            saved_count += 1
        except Exception as e:
            app.logger.error(f"Error saving file {dest_path}: {e}")
            
    return jsonify({
        'success': True,
        'saved_count': saved_count,
        'timestamp': time.time()
    })



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


@app.route('/games/<identifier>/')
def game(identifier):
    game_info = game_infos["games"][identifier]
    return render_template('game.html', game_info=game_info)


@app.route('/games/<identifier>/logo/emularity_color_small.png')
def emularity_logo(identifier):
    return redirect(url_for('static', filename='emularity/emularity_color_small.png'), code=301)


if __name__ == '__main__':
    app.run(debug=True)
