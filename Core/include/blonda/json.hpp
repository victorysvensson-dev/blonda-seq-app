// Minimal JSON reader for project files (loading only; not used on the audio thread).
#pragma once
#include <map>
#include <memory>
#include <string>
#include <vector>
#include <cstdlib>
#include <cctype>

namespace blonda::json {

struct Value {
    enum Type { Null, Bool, Number, String, Array, Object } type = Null;
    bool b = false; double num = 0; std::string str;
    std::vector<Value> arr; std::map<std::string, Value> obj;
    const Value& operator[](const std::string& k) const { static Value none_; auto it = obj.find(k); return it == obj.end() ? none_ : it->second; }
    const Value& operator[](size_t i) const { static Value none_; return i < arr.size() ? arr[i] : none_; }
    bool has(const std::string& k) const { return obj.count(k) > 0; }
    double numOr(double d) const { return type == Number ? num : (type == Bool ? (b ? 1 : 0) : d); }
    std::string strOr(const std::string& d) const { return type == String ? str : d; }
    size_t size() const { return type == Array ? arr.size() : obj.size(); }
};

class Parser {
public:
    explicit Parser(const std::string& s) : s_(s) {}
    bool parse(Value& out) { ws(); return value(out); }
private:
    const std::string& s_; size_t i_ = 0;
    void ws() { while (i_ < s_.size() && std::isspace((unsigned char)s_[i_])) ++i_; }
    bool lit(const char* w) { size_t n = std::string(w).size(); if (s_.compare(i_, n, w) == 0) { i_ += n; return true; } return false; }
    bool value(Value& v) {
        ws(); if (i_ >= s_.size()) return false; const char c = s_[i_];
        if (c == '{') { v.type = Value::Object; ++i_; ws(); if (s_[i_] == '}') { ++i_; return true; }
            for (;;) { ws(); std::string k; if (!string(k)) return false; ws(); if (s_[i_++] != ':') return false; Value x; if (!value(x)) return false; v.obj[k] = std::move(x); ws();
                if (s_[i_] == ',') { ++i_; continue; } if (s_[i_] == '}') { ++i_; return true; } return false; } }
        if (c == '[') { v.type = Value::Array; ++i_; ws(); if (s_[i_] == ']') { ++i_; return true; }
            for (;;) { Value x; if (!value(x)) return false; v.arr.push_back(std::move(x)); ws(); if (s_[i_] == ',') { ++i_; continue; } if (s_[i_] == ']') { ++i_; return true; } return false; } }
        if (c == '"') { v.type = Value::String; return string(v.str); }
        if (lit("true")) { v.type = Value::Bool; v.b = true; return true; }
        if (lit("false")) { v.type = Value::Bool; v.b = false; return true; }
        if (lit("null")) { v.type = Value::Null; return true; }
        char* end = nullptr; v.num = std::strtod(s_.c_str() + i_, &end); if (end == s_.c_str() + i_) return false;
        i_ = end - s_.c_str(); v.type = Value::Number; return true;
    }
    bool string(std::string& out) {
        if (s_[i_] != '"') return false; ++i_;
        while (i_ < s_.size() && s_[i_] != '"') {
            char c = s_[i_++];
            if (c == '\\') { char e = s_[i_++];
                if (e == 'n') out += '\n'; else if (e == 't') out += '\t'; else if (e == 'u') { unsigned cp = (unsigned)std::strtoul(s_.substr(i_, 4).c_str(), nullptr, 16); i_ += 4;
                    if (cp < 0x80) out += (char)cp; else if (cp < 0x800) { out += (char)(0xC0 | (cp >> 6)); out += (char)(0x80 | (cp & 63)); }
                    else { out += (char)(0xE0 | (cp >> 12)); out += (char)(0x80 | ((cp >> 6) & 63)); out += (char)(0x80 | (cp & 63)); } }
                else out += e; }
            else out += c;
        }
        ++i_; return true;
    }
};

inline bool parse(const std::string& s, Value& v) { Parser p(s); return p.parse(v); }

} // namespace blonda::json
