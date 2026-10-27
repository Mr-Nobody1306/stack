// stackeditor.cpp — Text editor with Undo/Redo built on TWO stacks.
// Compile: g++ -std=c++17 -O2 -o stackeditor stackeditor.cpp && ./stackeditor
//
// Design (same as the web app in index.html):
//   - undoSt holds snapshots of the text, newest on top (LIFO).
//   - Typing pushes the previous state; undo() pops it back and pushes the
//     current state onto redoSt; redo() does the mirror image.
//   - Any NEW edit after an undo clears redoSt (standard editor behavior).

#include <iostream>
#include <stack>
#include <string>

class TextEditor {
    std::string text;
    std::stack<std::string> undoSt;  // past states, top = most recent
    std::stack<std::string> redoSt;  // states we undid, top = next redo
    static const size_t MAX_HISTORY = 100;

    void remember() {
        // Snapshot BEFORE mutating. Bound memory by dropping the oldest.
        if (undoSt.size() >= MAX_HISTORY) {
            // std::stack has no bottom-drop; rebuild once when full.
            std::stack<std::string> tmp;
            std::string top = undoSt.top(); undoSt.pop();
            while (undoSt.size() > 1) { tmp.push(undoSt.top()); undoSt.pop(); }
            undoSt.pop(); // discard oldest
            while (!tmp.empty()) { undoSt.push(tmp.top()); tmp.pop(); }
            undoSt.push(top);
        }
        undoSt.push(text);
        while (!redoSt.empty()) redoSt.pop(); // new edit kills redo
    }

public:
    void type(const std::string& more) { remember(); text += more; }
    void eraseLast(size_t n) {
        remember();
        if (n >= text.size()) text.clear();
        else text.erase(text.size() - n);
    }
    bool undo() {
        if (undoSt.empty()) { std::cout << "[undo] nothing to undo\n"; return false; }
        redoSt.push(text);
        text = undoSt.top(); undoSt.pop();
        return true;
    }
    bool redo() {
        if (redoSt.empty()) { std::cout << "[redo] nothing to redo\n"; return false; }
        undoSt.push(text);
        text = redoSt.top(); redoSt.pop();
        return true;
    }
    void show() const { std::cout << "text: \"" << text << "\"\n"; }
    void depths() const {
        std::cout << "undo depth: " << undoSt.size()
                  << " | redo depth: " << redoSt.size() << "\n";
    }
};

int main() {
    TextEditor ed;
    ed.type("Hello");
    ed.type(", world");
    ed.type("!");            ed.show();   // "Hello, world!"

    ed.undo();               ed.show();   // "Hello, world"
    ed.undo();               ed.show();   // "Hello"
    ed.redo();               ed.show();   // "Hello, world"

    ed.type(" again");       ed.show();   // redo cleared by new edit
    ed.redo();                            // nothing to redo
    ed.depths();

    ed.undo(); ed.undo(); ed.undo(); ed.undo(); // last one: empty stack
    ed.show();
    return 0;
}
